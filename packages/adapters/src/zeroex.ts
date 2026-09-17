/**
 * 0x Swap API v2 adapter.
 *
 * Integrator fees ride inside the swap transaction via `swapFeeBps`, `swapFeeRecipient` and
 * `swapFeeToken`, so the platform's cut settles atomically to its own address and the platform
 * never touches trade principal. That is the whole non-custodial fee pattern in one parameter set.
 *
 * FEE DISCLOSURE. 0x charges its own `zeroExFee` on top of the integrator fee, and the pools
 * charge an LP fee underneath both. The user's real cost is all three. This adapter itemises
 * every one of them in the returned quote rather than reporting a single number, because a
 * front-end that shows only its own fee is understating the price — and several have been caught
 * doing exactly that.
 *
 * API KEYS NEVER REACH THE BROWSER. `baseUrl` is expected to point at the platform's edge Worker,
 * which injects the key server-side. Shipping a 0x key in a static bundle would publish it.
 */

import type { Caip2, Quote, QuoteFee, TxBatch, TxRequest } from '@web3eco/core';
import { erc20Caip19, evmChainId, parseCaip19 } from '@web3eco/core';
import type { QuoteRequest, SwapRouterPort } from '@web3eco/ports';

import { HttpClient } from './http.js';

/** Chains 0x serves. Testnets are absent because 0x does not support them. */
const SUPPORTED_CHAIN_IDS = new Set([1, 10, 56, 130, 137, 8453, 42_161, 43_114, 81_457, 534_352]);

export interface ZeroExOptions {
  /** Base URL of the platform's edge proxy, never api.0x.org directly from a browser. */
  readonly baseUrl: string;
  /** Address receiving the integrator fee. Must be the platform's fee recipient. */
  readonly feeRecipient: `0x${string}`;
  /** Integrator fee in basis points. Rejected above `MAX_INTEGRATOR_FEE_BPS`. */
  readonly feeBps: number;
  readonly http?: HttpClient;
}

/**
 * Ceiling on the integrator fee this adapter will ever request.
 *
 * Mirrors the 1% cap compiled into `FeeRouter`. The on-chain cap governs on-chain fee collection;
 * an aggregator fee is taken inside 0x's contract instead, so without this check a
 * misconfiguration could route a fee the platform has publicly promised it cannot charge.
 */
export const MAX_INTEGRATOR_FEE_BPS = 100;

interface ZeroExQuoteResponse {
  readonly liquidityAvailable: boolean;
  readonly buyAmount?: string;
  readonly sellAmount?: string;
  readonly minBuyAmount?: string;
  readonly totalNetworkFee?: string;
  readonly route?: { readonly fills?: readonly { readonly source: string }[] };
  readonly fees?: {
    readonly integratorFee?: { readonly amount: string; readonly token: string } | null;
    readonly zeroExFee?: { readonly amount: string; readonly token: string } | null;
    readonly gasFee?: { readonly amount: string; readonly token: string } | null;
  };
  readonly transaction?: {
    readonly to: `0x${string}`;
    readonly data: `0x${string}`;
    readonly value: string;
    readonly gas?: string;
  };
  readonly issues?: {
    readonly allowance?: { readonly spender: `0x${string}`; readonly actual: string } | null;
    readonly balance?: { readonly token: string; readonly actual: string } | null;
  };
}

export class ZeroExError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZeroExError';
  }
}

export class ZeroExSwapAdapter implements SwapRouterPort {
  readonly id = '0x';
  private readonly http: HttpClient;

  constructor(private readonly options: ZeroExOptions) {
    if (options.feeBps > MAX_INTEGRATOR_FEE_BPS) {
      throw new ZeroExError(
        `integrator fee of ${options.feeBps} bps exceeds the platform's published ceiling of ` +
          `${MAX_INTEGRATOR_FEE_BPS} bps`,
      );
    }
    if (options.feeBps < 0) throw new ZeroExError('integrator fee must not be negative');
    this.http = options.http ?? new HttpClient({ timeoutMs: 8_000 });
  }

  supports(chain: Caip2): boolean {
    try {
      return SUPPORTED_CHAIN_IDS.has(evmChainId(chain));
    } catch {
      return false; // non-EVM
    }
  }

  async quote(request: QuoteRequest): Promise<Quote> {
    const response = await this.fetchQuote(request);
    return this.toQuote(request, response);
  }

  /**
   * Build the swap.
   *
   * 0x reports any missing ERC-20 allowance in `issues.allowance`, which becomes an explicit
   * approval call in the batch. The approval is for exactly the sell amount rather than
   * unlimited: an infinite approval to a router is a standing risk for as long as it exists, and
   * with EIP-5792 batching the extra call costs one prompt, not two.
   */
  async buildSwap(request: QuoteRequest, _quote: Quote): Promise<TxBatch> {
    const response = await this.fetchQuote(request);

    if (!response.transaction) {
      throw new ZeroExError('0x returned a quote with no transaction to execute');
    }

    const calls: TxRequest[] = [];
    const spender = response.issues?.allowance?.spender;
    if (spender) {
      const sell = parseCaip19(request.sellAsset);
      calls.push({
        chain: request.chain,
        to: sell.assetReference as `0x${string}`,
        data: encodeApprove(spender, request.sellAmount),
        value: 0n,
        summary: `Approve exactly ${request.sellAmount} for the swap`,
      });
    }

    calls.push({
      chain: request.chain,
      to: response.transaction.to,
      data: response.transaction.data,
      value: BigInt(response.transaction.value ?? '0'),
      summary: 'Swap through 0x',
      ...(response.transaction.gas ? { gasLimit: BigInt(response.transaction.gas) } : {}),
    });

    return {
      chain: request.chain,
      calls,
      summary: 'Swap tokens',
      // Not atomic-only: an exact-amount approval left stranded is harmless, and demanding
      // atomicity would exclude every wallet without EIP-5792 support.
      requiresAtomicity: false,
    };
  }

  private async fetchQuote(request: QuoteRequest): Promise<ZeroExQuoteResponse> {
    if (!this.supports(request.chain)) {
      throw new ZeroExError(
        `0x does not serve ${request.chain}. Testnets in particular are unsupported, which is ` +
          'why a direct-router path exists.',
      );
    }
    if (request.sellAmount <= 0n) throw new ZeroExError('sell amount must be positive');
    if (request.slippageBps < 0 || request.slippageBps > 10_000) {
      throw new ZeroExError('slippage must be between 0 and 10000 bps');
    }

    const sell = parseCaip19(request.sellAsset);
    const buy = parseCaip19(request.buyAsset);

    const params = new URLSearchParams({
      chainId: String(evmChainId(request.chain)),
      sellToken: sell.assetReference,
      buyToken: buy.assetReference,
      sellAmount: request.sellAmount.toString(),
      taker: request.taker,
      slippageBps: String(request.slippageBps),
    });

    if (this.options.feeBps > 0) {
      params.set('swapFeeBps', String(this.options.feeBps));
      params.set('swapFeeRecipient', this.options.feeRecipient);
      // The fee is taken in the token being sold, which is the side whose amount is known
      // exactly up front. Taking it on the buy side would make the fee depend on the fill.
      params.set('swapFeeToken', sell.assetReference);
    }

    const url = `${trimSlash(this.options.baseUrl)}/swap/permit2/quote?${params.toString()}`;
    const response = await this.http.getJson<ZeroExQuoteResponse>(url);

    if (!response.liquidityAvailable) {
      throw new ZeroExError('0x found no route with sufficient liquidity for this pair and size');
    }
    return response;
  }

  private toQuote(request: QuoteRequest, response: ZeroExQuoteResponse): Quote {
    const buyAmount = BigInt(response.buyAmount ?? '0');
    const minBuyAmount = BigInt(response.minBuyAmount ?? response.buyAmount ?? '0');

    const fees: QuoteFee[] = [];
    const chain = request.chain;

    const integrator = response.fees?.integratorFee;
    if (integrator && integrator.amount !== '0') {
      fees.push({
        kind: 'integrator',
        label: 'Platform fee',
        asset: erc20Caip19(chain, integrator.token),
        amount: BigInt(integrator.amount),
        bps: BigInt(this.options.feeBps),
      });
    }

    // Reported even when it is zero, so the interface can state plainly that 0x itself is taking
    // nothing on this trade rather than leaving the user to wonder.
    const zeroEx = response.fees?.zeroExFee;
    if (zeroEx) {
      fees.push({
        kind: 'aggregator',
        label: '0x routing fee',
        asset: erc20Caip19(chain, zeroEx.token),
        amount: BigInt(zeroEx.amount),
        bps: null,
      });
    }

    if (response.totalNetworkFee && response.totalNetworkFee !== '0') {
      fees.push({
        kind: 'network',
        label: 'Estimated network fee',
        asset: request.sellAsset,
        amount: BigInt(response.totalNetworkFee),
        bps: null,
      });
    }

    const sources = response.route?.fills?.map((f) => f.source) ?? [];

    return {
      chain,
      sellAsset: request.sellAsset,
      buyAsset: request.buyAsset,
      sellAmount: request.sellAmount,
      buyAmount,
      minBuyAmount,
      fees,
      estimatedPriceImpactBps: null,
      source: sources.length > 0 ? `0x (${[...new Set(sources)].join(', ')})` : '0x',
      expiresAt: null,
    };
  }
}

/** `approve(address,uint256)` calldata. */
function encodeApprove(spender: `0x${string}`, amount: bigint): `0x${string}` {
  const selector = '095ea7b3';
  const paddedSpender = spender.slice(2).toLowerCase().padStart(64, '0');
  const paddedAmount = amount.toString(16).padStart(64, '0');
  return `0x${selector}${paddedSpender}${paddedAmount}`;
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
