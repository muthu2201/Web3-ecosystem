import { describe, expect, it, vi } from 'vitest';

import { CircuitOpenError, HttpClient, HttpError } from './http.js';
import { GoPlusRiskAdapter, mergeRiskReports } from './risk.js';
import { IpfsStorageAdapter, StorageError } from './storage.js';
import { MAX_INTEGRATOR_FEE_BPS, ZeroExError, ZeroExSwapAdapter } from './zeroex.js';

/** Build a fetch stub that replays a fixed sequence of responses. */
function stubFetch(responses: Array<{ status: number; body: string } | Error>) {
  let i = 0;
  return vi.fn(async () => {
    const next = responses[Math.min(i, responses.length - 1)];
    i++;
    if (next instanceof Error) throw next;
    return {
      ok: next!.status >= 200 && next!.status < 300,
      status: next!.status,
      statusText: '',
      headers: { get: () => null },
      text: async () => next!.body,
    } as unknown as Response;
  });
}

describe('HttpClient resilience', () => {
  it('retries transient failures and eventually succeeds', async () => {
    const fetchImpl = stubFetch([
      { status: 503, body: 'unavailable' },
      { status: 503, body: 'unavailable' },
      { status: 200, body: '{"ok":true}' },
    ]);
    const client = new HttpClient({ fetchImpl, baseBackoffMs: 1, random: () => 0 });

    await expect(client.getJson('https://example.test/x')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  /**
   * A 400 will fail identically on every attempt. Retrying it wastes the user's time and eats
   * into a shared rate limit for nothing.
   */
  it('does not retry a client error', async () => {
    const fetchImpl = stubFetch([{ status: 400, body: 'bad request' }]);
    const client = new HttpClient({ fetchImpl, baseBackoffMs: 1, random: () => 0 });

    await expect(client.getJson('https://example.test/x')).rejects.toThrow(HttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a 429, because the provider is asking us to back off rather than refusing', async () => {
    const fetchImpl = stubFetch([
      { status: 429, body: 'slow down' },
      { status: 200, body: '{"ok":true}' },
    ]);
    const client = new HttpClient({ fetchImpl, baseBackoffMs: 1, random: () => 0 });

    await expect(client.getJson('https://example.test/x')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after repeated failures and stops hammering the host', async () => {
    const fetchImpl = stubFetch([{ status: 500, body: 'boom' }]);
    const client = new HttpClient({
      fetchImpl,
      baseBackoffMs: 1,
      random: () => 0,
      maxRetries: 1,
      circuitThreshold: 4,
    });

    // Two calls x two attempts each = four failures, which trips the breaker.
    await expect(client.getJson('https://flaky.test/x')).rejects.toThrow();
    await expect(client.getJson('https://flaky.test/x')).rejects.toThrow();
    expect(client.circuitStateOf('flaky.test').open).toBe(true);

    const callsBefore = fetchImpl.mock.calls.length;
    await expect(client.getJson('https://flaky.test/x')).rejects.toThrow(CircuitOpenError);
    // The point of the breaker: the third call never reaches the network.
    expect(fetchImpl.mock.calls.length).toBe(callsBefore);
  });

  it('keeps circuits independent per host', async () => {
    const fetchImpl = stubFetch([{ status: 500, body: 'boom' }]);
    const client = new HttpClient({ fetchImpl, baseBackoffMs: 1, random: () => 0, maxRetries: 1, circuitThreshold: 2 });

    await expect(client.getJson('https://a.test/x')).rejects.toThrow();
    expect(client.circuitStateOf('a.test').open).toBe(true);
    expect(client.circuitStateOf('b.test').open).toBe(false);
  });

  it('half-opens after the reset window so a recovered host is not locked out forever', async () => {
    let clock = 1_000;
    const fetchImpl = stubFetch([
      { status: 500, body: 'boom' },
      { status: 500, body: 'boom' },
      { status: 200, body: '{"ok":true}' },
    ]);
    const client = new HttpClient({
      fetchImpl,
      baseBackoffMs: 1,
      random: () => 0,
      maxRetries: 1,
      circuitThreshold: 2,
      circuitResetMs: 5_000,
      now: () => clock,
    });

    await expect(client.getJson('https://recovers.test/x')).rejects.toThrow();
    expect(client.circuitStateOf('recovers.test').open).toBe(true);

    clock += 6_000;
    await expect(client.getJson('https://recovers.test/x')).resolves.toEqual({ ok: true });
    expect(client.circuitStateOf('recovers.test').open).toBe(false);
  });

  it('rejects a response larger than the cap instead of buffering it', async () => {
    const fetchImpl = stubFetch([{ status: 200, body: 'x'.repeat(5_000) }]);
    const client = new HttpClient({ fetchImpl, maxResponseBytes: 1_000, maxRetries: 0 });
    await expect(client.getJson('https://example.test/x')).rejects.toThrow(HttpError);
  });

  it('reports non-JSON as a clear error rather than throwing a parse exception', async () => {
    const fetchImpl = stubFetch([{ status: 200, body: '<html>maintenance</html>' }]);
    const client = new HttpClient({ fetchImpl, maxRetries: 0 });
    await expect(client.getJson('https://example.test/x')).rejects.toThrow(/not valid JSON/);
  });
});

describe('0x adapter', () => {
  const base = {
    baseUrl: 'https://edge.test/0x',
    feeRecipient: '0x1111111111111111111111111111111111111111' as const,
  };

  /**
   * The on-chain FeeRouter caps swap fees at 1%. An aggregator fee is taken inside 0x's contract
   * instead, so nothing on-chain would stop a misconfiguration here from charging more than the
   * platform has publicly promised.
   */
  it('refuses to be configured above the published fee ceiling', () => {
    expect(() => new ZeroExSwapAdapter({ ...base, feeBps: MAX_INTEGRATOR_FEE_BPS + 1 })).toThrow(
      ZeroExError,
    );
    expect(() => new ZeroExSwapAdapter({ ...base, feeBps: -1 })).toThrow(ZeroExError);
    expect(() => new ZeroExSwapAdapter({ ...base, feeBps: MAX_INTEGRATOR_FEE_BPS })).not.toThrow();
  });

  it('knows which chains 0x does not serve', () => {
    const adapter = new ZeroExSwapAdapter({ ...base, feeBps: 25 });
    expect(adapter.supports('eip155:8453')).toBe(true);
    expect(adapter.supports('eip155:56')).toBe(true);
    // Testnets: the reason a direct-router path has to exist at all.
    expect(adapter.supports('eip155:84532')).toBe(false);
    expect(adapter.supports('eip155:97')).toBe(false);
    expect(adapter.supports('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(false);
  });

  it('itemises every fee, including 0x’s own, not just the platform’s', async () => {
    const fetchImpl = stubFetch([
      {
        status: 200,
        body: JSON.stringify({
          liquidityAvailable: true,
          buyAmount: '1000000',
          minBuyAmount: '990000',
          totalNetworkFee: '12345',
          route: { fills: [{ source: 'Uniswap_V3' }] },
          fees: {
            integratorFee: { amount: '2500', token: '0xaaa' },
            zeroExFee: { amount: '1500', token: '0xaaa' },
          },
        }),
      },
    ]);
    const adapter = new ZeroExSwapAdapter({
      ...base,
      feeBps: 25,
      http: new HttpClient({ fetchImpl, maxRetries: 0 }),
    });

    const quote = await adapter.quote({
      chain: 'eip155:8453',
      sellAsset: 'eip155:8453/erc20:0xaaa',
      buyAsset: 'eip155:8453/erc20:0xbbb',
      sellAmount: 1_000_000n,
      taker: '0x2222222222222222222222222222222222222222',
      slippageBps: 100,
    });

    const kinds = quote.fees.map((f) => f.kind);
    expect(kinds).toContain('integrator');
    // The disclosure that front-ends routinely omit.
    expect(kinds).toContain('aggregator');
    expect(kinds).toContain('network');
    expect(quote.minBuyAmount).toBe(990_000n);
  });

  it('surfaces a no-liquidity response as a clear error', async () => {
    const fetchImpl = stubFetch([{ status: 200, body: JSON.stringify({ liquidityAvailable: false }) }]);
    const adapter = new ZeroExSwapAdapter({
      ...base,
      feeBps: 25,
      http: new HttpClient({ fetchImpl, maxRetries: 0 }),
    });

    await expect(
      adapter.quote({
        chain: 'eip155:8453',
        sellAsset: 'eip155:8453/erc20:0xaaa',
        buyAsset: 'eip155:8453/erc20:0xbbb',
        sellAmount: 1n,
        taker: '0x2222222222222222222222222222222222222222',
        slippageBps: 100,
      }),
    ).rejects.toThrow(/no route/);
  });
});

describe('risk scanning', () => {
  const options = { baseUrl: 'https://edge.test/goplus' };

  /**
   * The most important behaviour in the whole adapter: a scanner outage must never render as a
   * green tick. An empty findings list is indistinguishable from "this token is fine".
   */
  it('reports an outage as an explicit warning, never as a clean result', async () => {
    const fetchImpl = stubFetch([new Error('network down')]);
    const adapter = new GoPlusRiskAdapter({
      ...options,
      http: new HttpClient({ fetchImpl, maxRetries: 0, baseBackoffMs: 1 }),
    });

    const report = await adapter.scan('eip155:8453/erc20:0xaaa');
    expect(report.sources).toEqual([]);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.code).toBe('SCAN_UNAVAILABLE');
    expect(report.findings[0]?.severity).toBe('warning');
  });

  it('flags a honeypot as critical', async () => {
    const fetchImpl = stubFetch([
      {
        status: 200,
        body: JSON.stringify({
          result: { '0xaaa': { is_honeypot: '1', is_open_source: '1', buy_tax: '0', sell_tax: '0' } },
        }),
      },
    ]);
    const adapter = new GoPlusRiskAdapter({
      ...options,
      http: new HttpClient({ fetchImpl, maxRetries: 0 }),
    });

    const report = await adapter.scan('eip155:8453/erc20:0xaaa');
    expect(report.findings.map((f) => f.code)).toContain('HONEYPOT');
    expect(report.findings[0]?.severity).toBe('critical');
    expect(report.sources).toEqual(['goplus']);
  });

  it('treats a modifiable tax as critical, since that is the honeypot mechanism', async () => {
    const fetchImpl = stubFetch([
      {
        status: 200,
        body: JSON.stringify({
          result: { '0xaaa': { slippage_modifiable: '1', is_open_source: '1' } },
        }),
      },
    ]);
    const adapter = new GoPlusRiskAdapter({
      ...options,
      http: new HttpClient({ fetchImpl, maxRetries: 0 }),
    });

    const report = await adapter.scan('eip155:8453/erc20:0xaaa');
    const finding = report.findings.find((f) => f.code === 'TAX_MODIFIABLE');
    expect(finding?.severity).toBe('critical');
  });

  it('treats unverified source as critical', async () => {
    const fetchImpl = stubFetch([
      { status: 200, body: JSON.stringify({ result: { '0xaaa': { is_open_source: '0' } } }) },
    ]);
    const adapter = new GoPlusRiskAdapter({
      ...options,
      http: new HttpClient({ fetchImpl, maxRetries: 0 }),
    });

    const report = await adapter.scan('eip155:8453/erc20:0xaaa');
    expect(report.findings.map((f) => f.code)).toContain('UNVERIFIED_SOURCE');
  });

  it('resolves a severity disagreement upward, never downward', () => {
    const merged = mergeRiskReports('eip155:8453/erc20:0xaaa', [
      {
        asset: 'eip155:8453/erc20:0xaaa',
        findings: [{ code: 'TAXED', severity: 'warning', title: 'a', detail: 'b' }],
        checkedAt: 1,
        sources: ['onchain'],
      },
      {
        asset: 'eip155:8453/erc20:0xaaa',
        findings: [{ code: 'TAXED', severity: 'critical', title: 'a', detail: 'b' }],
        checkedAt: 2,
        sources: ['goplus'],
      },
    ]);

    expect(merged.findings).toHaveLength(1);
    expect(merged.findings[0]?.severity).toBe('critical');
    expect(merged.sources).toEqual(['onchain', 'goplus']);
  });
});

describe('IPFS URI resolution', () => {
  const adapter = new IpfsStorageAdapter({ baseUrl: 'https://edge.test/pin' });

  it('resolves ipfs:// and ar:// through a gateway', () => {
    expect(adapter.resolveUri('ipfs://bafyabc')).toBe('https://ipfs.io/ipfs/bafyabc');
    expect(adapter.resolveUri('ar://xyz')).toBe('https://arweave.net/xyz');
  });

  it('passes HTTPS through unchanged', () => {
    expect(adapter.resolveUri('https://example.test/a.png')).toBe('https://example.test/a.png');
  });

  /**
   * Token metadata is user-supplied. Blindly prefixing the gateway onto anything unrecognised
   * would let a javascript: or data: URI become a live URL rendered on the listing page.
   */
  it('refuses to resolve a dangerous scheme', () => {
    expect(() => adapter.resolveUri('javascript:alert(1)')).toThrow(StorageError);
    expect(() => adapter.resolveUri('data:text/html,<script>alert(1)</script>')).toThrow(StorageError);
    expect(() => adapter.resolveUri('file:///etc/passwd')).toThrow(StorageError);
  });
});
