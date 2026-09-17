import { describe, expect, it, vi } from 'vitest';

import { checkRateLimit, callerKey } from './ratelimit.js';
import {
  buildUpstreamUrl,
  corsHeaders,
  isOriginAllowed,
  parseAllowedOrigins,
  requireAddress,
  requireBounded,
  requireChainId,
  requireUint,
  ValidationError,
} from './security.js';

/** In-memory KV good enough to exercise the limiter's logic. */
function fakeKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

describe('rate limiting', () => {
  it('allows up to the limit and then refuses', async () => {
    const kv = fakeKv();
    const now = () => 1_000_000;

    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit({ kv, key: 'a', limit: 3, windowSeconds: 60, now });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2 - i);
    }

    const blocked = await checkRateLimit({ kv, key: 'a', limit: 3, windowSeconds: 60, now });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('starts a fresh allowance in the next window', async () => {
    const kv = fakeKv();
    let clock = 1_000_000;

    await checkRateLimit({ kv, key: 'a', limit: 1, windowSeconds: 60, now: () => clock });
    const blocked = await checkRateLimit({ kv, key: 'a', limit: 1, windowSeconds: 60, now: () => clock });
    expect(blocked.allowed).toBe(false);

    clock += 61_000;
    const fresh = await checkRateLimit({ kv, key: 'a', limit: 1, windowSeconds: 60, now: () => clock });
    expect(fresh.allowed).toBe(true);
  });

  it('keeps callers independent', async () => {
    const kv = fakeKv();
    const now = () => 1_000_000;
    await checkRateLimit({ kv, key: 'alice', limit: 1, windowSeconds: 60, now });

    const bob = await checkRateLimit({ kv, key: 'bob', limit: 1, windowSeconds: 60, now });
    expect(bob.allowed).toBe(true);
  });

  /** A corrupt counter must not become an unlimited-access bypass. */
  it('recovers from a corrupt counter without failing open', async () => {
    const kv = fakeKv();
    const now = () => 1_000_000;
    const windowStart = Math.floor(1_000_000 / 60_000) * 60_000;
    kv.store.set(`rl:a:${windowStart}`, 'not-a-number');

    const result = await checkRateLimit({ kv, key: 'a', limit: 2, windowSeconds: 60, now });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);

    await checkRateLimit({ kv, key: 'a', limit: 2, windowSeconds: 60, now });
    const blocked = await checkRateLimit({ kv, key: 'a', limit: 2, windowSeconds: 60, now });
    expect(blocked.allowed).toBe(false);
  });

  /**
   * X-Forwarded-For is a client-writable header. Keying off it would let anyone reset their own
   * limit by sending a random value per request.
   */
  it('identifies callers by the header Cloudflare sets, not a spoofable one', () => {
    const spoofed = new Request('https://x.test', {
      headers: { 'X-Forwarded-For': '1.2.3.4', 'CF-Connecting-IP': '9.9.9.9' },
    });
    expect(callerKey(spoofed)).toBe('9.9.9.9');
  });
});

describe('CORS', () => {
  const allowed = parseAllowedOrigins('https://app.example.com, https://staging.example.com');

  it('reflects only allowlisted origins', () => {
    const headers = corsHeaders('https://app.example.com', allowed) as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
  });

  /** A wildcard would let any site spend this proxy's third-party quota. */
  it('never falls back to a wildcard for an unknown origin', () => {
    const headers = corsHeaders('https://evil.test', allowed) as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(isOriginAllowed('https://evil.test', allowed)).toBe(false);
  });

  it('varies on Origin so a shared cache cannot cross-serve', () => {
    const headers = corsHeaders('https://app.example.com', allowed) as Record<string, string>;
    expect(headers['Vary']).toBe('Origin');
  });

  it('permits requests with no Origin, which are same-origin or server-side', () => {
    expect(isOriginAllowed(null, allowed)).toBe(true);
  });
});

describe('input validation', () => {
  it('accepts a well-formed address and rejects anything else', () => {
    expect(requireAddress('0xAbCdEf0123456789012345678901234567890123', 'a')).toBe(
      '0xabcdef0123456789012345678901234567890123',
    );
    for (const bad of [null, '', '0x123', 'not-an-address', '0xzz'.padEnd(42, 'z')]) {
      expect(() => requireAddress(bad, 'a')).toThrow(ValidationError);
    }
  });

  it('rejects non-integer and out-of-range chain ids', () => {
    expect(requireChainId('8453')).toBe(8453);
    for (const bad of [null, '0', '-1', '1.5', 'abc']) {
      expect(() => requireChainId(bad)).toThrow(ValidationError);
    }
  });

  it('accepts uint256-scale integers as strings without going through Number', () => {
    expect(requireUint('115792089237316195423570985008687907853269984665640564039457584007913129639935', 'a')).toBeTruthy();
    expect(() => requireUint('-1', 'a')).toThrow(ValidationError);
    expect(() => requireUint('1e18', 'a')).toThrow(ValidationError);
  });

  it('enforces numeric bounds', () => {
    expect(requireBounded('50', 'x', 0, 100)).toBe(50);
    expect(() => requireBounded('101', 'x', 0, 100)).toThrow(ValidationError);
    expect(() => requireBounded('-1', 'x', 0, 100)).toThrow(ValidationError);
  });
});

describe('upstream URL construction', () => {
  const allowedParams = ['chainId', 'sellToken'];

  it('forwards only allowlisted parameters', () => {
    const params = new URLSearchParams({
      chainId: '8453',
      sellToken: '0xaaa',
      // Must not be forwarded: a caller-supplied key would be a way to bill someone else, and a
      // caller-supplied callback is an SSRF primitive.
      apiKey: 'stolen',
      callback: 'https://evil.test',
    });

    const url = buildUpstreamUrl('https://api.0x.org/', 'swap/permit2/quote', params, allowedParams);
    expect(url).toContain('chainId=8453');
    expect(url).toContain('sellToken=0xaaa');
    expect(url).not.toContain('apiKey');
    expect(url).not.toContain('callback');
  });

  /**
   * The upstream host is fixed in code. A path that tries to escape it must still resolve inside
   * the intended origin, or the proxy becomes an SSRF engine.
   */
  it('cannot be redirected to another host by a crafted path', () => {
    const url = buildUpstreamUrl(
      'https://api.0x.org/',
      '../../evil.test/steal',
      new URLSearchParams(),
      [],
    );
    expect(new URL(url).host).toBe('api.0x.org');
  });

  it('keeps a leading-slash path inside the base path', () => {
    const url = buildUpstreamUrl('https://api.0x.org/', '/swap/quote', new URLSearchParams(), []);
    expect(new URL(url).host).toBe('api.0x.org');
    expect(new URL(url).pathname).toBe('/swap/quote');
  });
});
