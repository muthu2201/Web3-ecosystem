/**
 * Resilient HTTP client shared by every external adapter.
 *
 * The blueprint is explicit that third-party dependency risk is real: charts depend on
 * GeckoTerminal, routing on 0x and Jupiter, storage on Pinata, and each has its own uptime,
 * rate limits and terms. A naive `fetch` turns any one of their bad days into an outage here,
 * and turns a rate-limit response into a retry storm that makes it worse.
 *
 * So every outbound call gets: a hard timeout, bounded retries with exponential backoff and full
 * jitter, a circuit breaker per host, and a response size cap.
 */

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
    readonly url: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  /**
   * Whether retrying could plausibly succeed.
   *
   * 4xx responses other than 408/425/429 are the caller's fault and will fail identically on
   * every attempt; retrying them wastes the user's time and the provider's rate limit.
   */
  get retryable(): boolean {
    if (this.status === 408 || this.status === 425 || this.status === 429) return true;
    return this.status >= 500;
  }
}

export class CircuitOpenError extends Error {
  constructor(host: string, readonly retryAfterMs: number) {
    super(`circuit breaker open for ${host}; retry in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = 'CircuitOpenError';
  }
}

export interface HttpClientOptions {
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  /** Responses larger than this are rejected rather than buffered. */
  readonly maxResponseBytes?: number;
  /** Consecutive failures before a host's circuit opens. */
  readonly circuitThreshold?: number;
  /** How long a circuit stays open. */
  readonly circuitResetMs?: number;
  readonly fetchImpl?: typeof fetch;
  /** Injected for deterministic tests; defaults to Math.random. */
  readonly random?: () => number;
  readonly now?: () => number;
}

interface CircuitState {
  failures: number;
  openedAt: number | null;
}

export class HttpClient {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly maxResponseBytes: number;
  private readonly circuitThreshold: number;
  private readonly circuitResetMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly circuits = new Map<string, CircuitState>();

  constructor(options: HttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 250;
    this.maxBackoffMs = options.maxBackoffMs ?? 8_000;
    this.maxResponseBytes = options.maxResponseBytes ?? 4 * 1024 * 1024;
    this.circuitThreshold = options.circuitThreshold ?? 5;
    this.circuitResetMs = options.circuitResetMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
  }

  async getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    return this.requestJson<T>(url, { ...init, method: init.method ?? 'GET' });
  }

  async postJson<T>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
    return this.requestJson<T>(url, {
      ...init,
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      body: JSON.stringify(body),
    });
  }

  private async requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const text = await this.request(url, init);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpError('response was not valid JSON', 0, text.slice(0, 500), url);
    }
  }

  /** Perform a request with timeout, retry and circuit breaking. Returns the body as text. */
  async request(url: string, init: RequestInit = {}): Promise<string> {
    const host = hostOf(url);
    this.assertCircuitClosed(host);

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await this.sleep(this.backoffFor(attempt));

      try {
        const text = await this.attempt(url, init);
        this.recordSuccess(host);
        return text;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof HttpError ? err.retryable : isTransient(err);
        // A non-retryable error means the request itself is wrong, so it must not count
        // against the host's circuit: a run of 400s says nothing about the host's health.
        if (!retryable) throw err;
        this.recordFailure(host);
        if (attempt === this.maxRetries) break;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new HttpError('request failed', 0, String(lastError), url);
  }

  private async attempt(url: string, init: RequestInit): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, { ...init, signal: controller.signal });

      const declared = response.headers?.get?.('content-length');
      if (declared && Number(declared) > this.maxResponseBytes) {
        throw new HttpError(
          `response of ${declared} bytes exceeds the ${this.maxResponseBytes}-byte cap`,
          response.status,
          '',
          url,
        );
      }

      const text = await response.text();
      if (text.length > this.maxResponseBytes) {
        throw new HttpError(
          `response exceeded the ${this.maxResponseBytes}-byte cap`,
          response.status,
          '',
          url,
        );
      }

      if (!response.ok) {
        throw new HttpError(
          `${response.status} ${response.statusText || ''}`.trim(),
          response.status,
          text.slice(0, 1_000),
          url,
        );
      }

      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Exponential backoff with full jitter, which avoids synchronised retry storms. */
  private backoffFor(attempt: number): number {
    const ceiling = Math.min(this.baseBackoffMs * 2 ** (attempt - 1), this.maxBackoffMs);
    return Math.floor(this.random() * ceiling);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private assertCircuitClosed(host: string): void {
    const circuit = this.circuits.get(host);
    if (!circuit?.openedAt) return;

    const elapsed = this.now() - circuit.openedAt;
    if (elapsed >= this.circuitResetMs) {
      // Half-open: allow one probe through rather than reopening blindly.
      circuit.openedAt = null;
      circuit.failures = this.circuitThreshold - 1;
      return;
    }
    throw new CircuitOpenError(host, this.circuitResetMs - elapsed);
  }

  private recordFailure(host: string): void {
    const circuit = this.circuits.get(host) ?? { failures: 0, openedAt: null };
    circuit.failures += 1;
    if (circuit.failures >= this.circuitThreshold && !circuit.openedAt) {
      circuit.openedAt = this.now();
    }
    this.circuits.set(host, circuit);
  }

  private recordSuccess(host: string): void {
    this.circuits.set(host, { failures: 0, openedAt: null });
  }

  /** Exposed for tests and for a health endpoint. */
  circuitStateOf(host: string): { failures: number; open: boolean } {
    const circuit = this.circuits.get(host);
    return { failures: circuit?.failures ?? 0, open: Boolean(circuit?.openedAt) };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isTransient(err: unknown): boolean {
  if (err instanceof CircuitOpenError) return false;
  if (err instanceof Error) {
    // Aborts (timeout) and network-level failures are worth retrying.
    return err.name === 'AbortError' || err.name === 'TypeError' || err.name === 'FetchError';
  }
  return false;
}
