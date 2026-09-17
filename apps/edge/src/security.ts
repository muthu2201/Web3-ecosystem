/**
 * Security headers, CORS and input validation for the edge Worker.
 *
 * The Bybit/Safe compromise in February 2025 moved roughly $1.46B without touching a single
 * contract: attackers injected JavaScript into a served front-end. For a static, non-custodial
 * app, the served bundle IS the attack surface, so these headers are not boilerplate - a strict
 * CSP is what stops an injected script from reaching an attacker's server even if it somehow gets
 * onto the page.
 */

/** Origins allowed to call the proxy, parsed from configuration. */
export function parseAllowedOrigins(raw: string | undefined): readonly string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * CORS headers for an allowed origin.
 *
 * Reflects only origins on the allowlist and never falls back to `*`. A wildcard here would let
 * any site on the internet spend this proxy's third-party API quota, and would defeat the point
 * of hiding the keys behind it in the first place.
 */
export function corsHeaders(origin: string | null, allowed: readonly string[]): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    // Different origins get different responses; without this a shared cache could serve one
    // origin's CORS headers to another.
    Vary: 'Origin',
  };

  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function isOriginAllowed(origin: string | null, allowed: readonly string[]): boolean {
  // A same-origin or server-side call has no Origin header; only cross-origin browser requests
  // need to be on the list.
  if (!origin) return true;
  return allowed.includes(origin);
}

/**
 * Response headers applied to everything the Worker serves.
 *
 * The CSP is deliberately restrictive. `default-src 'none'` means anything not explicitly
 * permitted is blocked, so a future addition has to be allowed on purpose rather than inheriting
 * permission by accident.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const UINT_RE = /^\d{1,78}$/;

export function requireAddress(value: string | null, field: string): string {
  if (!value || !ADDRESS_RE.test(value)) {
    throw new ValidationError(`"${field}" must be a 20-byte hex address`);
  }
  return value.toLowerCase();
}

export function requireUint(value: string | null, field: string): string {
  if (!value || !UINT_RE.test(value)) {
    throw new ValidationError(`"${field}" must be a non-negative integer`);
  }
  return value;
}

export function requireChainId(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 2 ** 53 - 1) {
    throw new ValidationError('"chainId" must be a positive integer');
  }
  return parsed;
}

export function requireBounded(
  value: string | null,
  field: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`"${field}" must be between ${min} and ${max}`);
  }
  return parsed;
}

/**
 * Build an allowlisted upstream URL.
 *
 * Only parameters named in `allowedParams` are forwarded, and every value is validated by the
 * caller first. Forwarding the client's query string wholesale is how a proxy becomes an open
 * redirect or an SSRF vector; here the upstream host is fixed in code and the client cannot
 * influence it at all.
 */
export function buildUpstreamUrl(
  base: string,
  path: string,
  params: URLSearchParams,
  allowedParams: readonly string[],
): string {
  const url = new URL(path.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`);
  for (const name of allowedParams) {
    const value = params.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }
  return url.toString();
}

export function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Turn an error into a response without leaking internals.
 *
 * Validation errors are echoed because they tell the caller how to fix their request. Everything
 * else is flattened to a generic message: an upstream error string can contain an API key, an
 * internal hostname or a stack trace, and this proxy exists precisely to keep those server-side.
 */
export function errorResponse(err: unknown, extraHeaders: HeadersInit = {}): Response {
  if (err instanceof ValidationError) {
    return jsonResponse({ error: err.message }, 400, extraHeaders);
  }
  return jsonResponse({ error: 'upstream request failed' }, 502, extraHeaders);
}
