/**
 * Post-graduation OHLC via GeckoTerminal.
 *
 * The live bonding-curve price needs none of this: it is a pure function of on-chain reserves and
 * is computed client-side by `@web3eco/core`. Only history for a graduated pool needs an external
 * source, which keeps the dependency narrow and means an outage here degrades one chart rather
 * than breaking trading.
 *
 * That dependency is real and worth stating: if GeckoTerminal changes its terms or goes down,
 * historical charts stop. The port boundary is what makes swapping in DEX Screener or a
 * self-hosted indexer a config change.
 */

import type { Caip19, Candle, Timeframe } from '@web3eco/core';
import { evmChainId, parseCaip19 } from '@web3eco/core';
import type { ChartDataPort } from '@web3eco/ports';

import { HttpClient } from './http.js';

/** GeckoTerminal network slugs, keyed by EVM chain id. */
const NETWORK_SLUGS: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  56: 'bsc',
  137: 'polygon_pos',
  8453: 'base',
  42_161: 'arbitrum',
  43_114: 'avax',
};

const TIMEFRAME_PATHS: Record<Timeframe, { path: string; aggregate: string }> = {
  '1m': { path: 'minute', aggregate: '1' },
  '5m': { path: 'minute', aggregate: '5' },
  '15m': { path: 'minute', aggregate: '15' },
  '1h': { path: 'hour', aggregate: '1' },
  '4h': { path: 'hour', aggregate: '4' },
  '1d': { path: 'day', aggregate: '1' },
};

export interface GeckoTerminalOptions {
  readonly baseUrl: string;
  readonly http?: HttpClient;
}

interface OhlcvResponse {
  readonly data?: {
    readonly attributes?: {
      /** [timestamp, open, high, low, close, volume] */
      readonly ohlcv_list?: readonly (readonly number[])[];
    };
  };
}

export class ChartDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChartDataError';
  }
}

export class GeckoTerminalChartAdapter implements ChartDataPort {
  private readonly http: HttpClient;

  constructor(private readonly options: GeckoTerminalOptions) {
    this.http = options.http ?? new HttpClient({ timeoutMs: 8_000, maxRetries: 2 });
  }

  /**
   * @param asset CAIP-19 identifying the POOL, not the token: OHLC is a property of a pair.
   */
  async ohlc(asset: Caip19, timeframe: Timeframe, limit: number): Promise<readonly Candle[]> {
    if (limit <= 0 || limit > 1_000) {
      throw new ChartDataError('limit must be between 1 and 1000');
    }

    const parsed = parseCaip19(asset);
    const chainId = evmChainId(parsed.chain);
    const network = NETWORK_SLUGS[chainId];
    if (!network) {
      throw new ChartDataError(`GeckoTerminal has no network slug for chain id ${chainId}`);
    }

    const tf = TIMEFRAME_PATHS[timeframe];
    const url =
      `${this.options.baseUrl.replace(/\/$/, '')}/networks/${network}/pools/` +
      `${parsed.assetReference}/ohlcv/${tf.path}?aggregate=${tf.aggregate}&limit=${limit}`;

    const payload = await this.http.getJson<OhlcvResponse>(url);
    const rows = payload.data?.attributes?.ohlcv_list ?? [];

    return rows
      .map((row): Candle | null => {
        const [timestamp, open, high, low, close, volume] = row;
        if (
          timestamp === undefined ||
          open === undefined ||
          high === undefined ||
          low === undefined ||
          close === undefined
        ) {
          return null;
        }
        return { timestamp, open, high, low, close, volume: volume ?? 0 };
      })
      .filter((c): c is Candle => c !== null)
      // GeckoTerminal returns newest first; charting libraries want oldest first.
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}
