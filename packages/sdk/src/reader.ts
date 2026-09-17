/**
 * Read-only chain access built on viem, with the user's wallet RPC preferred.
 */

import { getChain } from '@web3eco/chain-registry';
import type { Address, Caip2, Hex } from '@web3eco/core';
import { evmChainId } from '@web3eco/core';
import type { ChainReaderPort } from '@web3eco/ports';
import {
  createPublicClient,
  custom,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  type EIP1193Provider,
  type PublicClient,
} from 'viem';

/**
 * Minimal Multicall3 surface. Only `aggregate3` is declared, because these are pre-encoded raw
 * calls rather than typed contract reads and the rest of the ABI would be dead weight.
 */
const MULTICALL3_ABI = [
  {
    type: 'function',
    name: 'aggregate3',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
] as const;

export class SdkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SdkError';
  }
}

export interface ReaderOptions {
  /** The connected wallet's EIP-1193 provider. Strongly preferred over any platform RPC. */
  readonly provider?: EIP1193Provider;
  /** Explicit RPC URL, used when no wallet provider is available. */
  readonly rpcUrl?: string;
}

/**
 * Chain reader.
 *
 * Transport order is deliberate: the user's wallet first, then an explicit RPC, then the chain's
 * public endpoint. Serving reads through the wallet the user already has open costs the platform
 * nothing, which is the single decision that keeps infrastructure spend flat as traffic grows.
 * A platform-funded RPC is the fallback, not the default.
 */
export class ViemChainReader implements ChainReaderPort {
  readonly chain: Caip2;
  private readonly client: PublicClient;

  constructor(chain: Caip2, options: ReaderOptions = {}) {
    this.chain = chain;
    const config = getChain(chain);
    const chainId = evmChainId(chain);

    const transport = options.provider
      ? custom(options.provider)
      : http(options.rpcUrl ?? config.publicRpcUrls[0]);

    this.client = createPublicClient({
      transport,
      chain: {
        id: chainId,
        name: config.name,
        nativeCurrency: config.nativeCurrency,
        rpcUrls: { default: { http: [...config.publicRpcUrls] } },
      },
    });
  }

  get publicClient(): PublicClient {
    return this.client;
  }

  async call(to: Address, data: Hex): Promise<Hex> {
    const result = await this.client.call({ to, data });
    return (result.data ?? '0x') as Hex;
  }

  /**
   * Batched reads through Multicall3's `aggregate3`.
   *
   * Collapsing a listing page's twenty reads into one round trip is what keeps hydration fast on
   * a wallet RPC that may be rate-limited. `allowFailure` is true so one reverting read - an
   * unverified token missing an optional method, say - returns empty data instead of failing the
   * whole page.
   *
   * Falls back to sequential calls when the chain has no Multicall3 deployment. Slower, but the
   * page still renders.
   */
  async multicall(calls: readonly { to: Address; data: Hex }[]): Promise<readonly Hex[]> {
    if (calls.length === 0) return [];
    const config = getChain(this.chain);
    if (!config.multicall3) {
      return Promise.all(calls.map((c) => this.call(c.to, c.data)));
    }

    const data = encodeFunctionData({
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [calls.map((c) => ({ target: c.to, allowFailure: true, callData: c.data }))],
    });

    const raw = await this.client.call({ to: config.multicall3, data });
    if (!raw.data) throw new SdkError('multicall returned no data');

    const decoded = decodeFunctionResult({
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      data: raw.data,
    });

    return decoded.map((r) => (r.success ? (r.returnData as Hex) : ('0x' as Hex)));
  }

  async getBalance(address: Address): Promise<bigint> {
    return this.client.getBalance({ address });
  }

  async getBlockTimestamp(): Promise<number> {
    const block = await this.client.getBlock();
    return Number(block.timestamp);
  }

  async getCode(address: Address): Promise<Hex> {
    const code = await this.client.getCode({ address });
    return (code ?? '0x') as Hex;
  }
}
