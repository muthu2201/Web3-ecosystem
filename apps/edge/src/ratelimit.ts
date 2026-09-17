/**
 * Fixed-window rate limiting backed by Workers KV.
 *
 * KV is eventually consistent, so a determined attacker can squeeze extra requests through by
 * spreading them across edge locations. That is understood and accepted: this limiter exists to
 * keep third-party quotas from being burned through and to dampen casual abuse, not to be a
 * security boundary. Everything that must be exact - fee ceilings, supply caps, ownership - is
 * enforced on chain, where it cannot be raced.
 *
 * A fixed window is used rather than a sliding log because a sliding log needs a read-modify-write
 * of an unbounded list on every request, which on KV is both slow and racy. The cost is that a
 * caller can send 2x the limit across a window boundary; for quota protection that is fine.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
}

export interface RateLimitOptions {
  readonly kv: KVNamespace;
  readonly key: string;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly now?: () => number;
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const now = (options.now ?? Date.now)();
  const windowMs = options.windowSeconds * 1_000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const storageKey = `rl:${options.key}:${windowStart}`;

  const current = await options.kv.get(storageKey);
  const count = current ? Number(current) : 0;

  if (Number.isNaN(count)) {
    // A corrupt counter must not fail open into unlimited access, nor hard-fail the request.
    // Treating it as one use restarts the window cleanly.
    await options.kv.put(storageKey, '1', { expirationTtl: options.windowSeconds + 60 });
    return { allowed: true, limit: options.limit, remaining: options.limit - 1, resetAt };
  }

  if (count >= options.limit) {
    return { allowed: false, limit: options.limit, remaining: 0, resetAt };
  }

  await options.kv.put(storageKey, String(count + 1), {
    // Outlive the window so a counter cannot expire mid-window and reset the limit early.
    expirationTtl: options.windowSeconds + 60,
  });

  return {
    allowed: true,
    limit: options.limit,
    remaining: options.limit - count - 1,
    resetAt,
  };
}

/**
 * Identify the caller for rate-limiting purposes.
 *
 * `CF-Connecting-IP` is set by Cloudflare itself and cannot be spoofed by the client, unlike
 * `X-Forwarded-For`, which is just a request header anyone can write. Using the latter would make
 * the limiter trivially bypassable by sending a random value on each request.
 */
export function callerKey(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}
