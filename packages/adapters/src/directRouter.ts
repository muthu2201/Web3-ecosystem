/**
 * Direct Uniswap-V2-style router swaps, for chains no aggregator serves.
 *
 * 0x does not support testnets, and a brand-new token is not routable by any aggregator until it
 * has been indexed — minutes to hours after its pool is created. Both are exactly the moments
 * this platform most needs a working swap: the whole testnet flow, and the first trades on a
 * token someone has just launched. A direct router path is therefore mandatory, not a fallback
 * bolted on later.
 *
 * The integrator fee cannot ride inside the router call the way it does with 0x, so it is taken
 * as a separate transfer to the FeeRouter in the same batch. That keeps the fee atomic with the
 * swap for wallets supporting EIP-5792 and still non-custodial for those that do not.
 */

import { defaultDex, getChain, getDeployment, getDex } from '@web3eco/chain-registry';
import type { Address, Caip2, Quote, QuoteFee, TxBatch, TxRequest } from '@web3eco/core';
import { applySlippage, erc20Caip19, feeOn, parseCaip19 } from '@web3eco/core';
import type { ChainReaderPort, QuoteRequest, SwapRouterPort } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

const ROUTER_ABI = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const FEE_ROUTER_ABI = [
  {
    type: 'function',
    name: 'routeNative',
    stateMutability: 'payable',
    inputs: [
      { name: 'product', type: 'uint8' },
      { name: 'creator', type: 'address' },
    ],
    outputs: [],
  },
] as const;

export interface DirectRouterOptions {
  readonly readerFor: (chain: Caip2) => ChainReaderPort;
  /** Integrator fee in bps. Capped at the FeeRouter's 1% ceiling for swaps. */
  readonly feeBps: number;
  readonly dexId?: string;
}

export const MAX_SWAP_FEE_BPS = 100;

export class DirectRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DirectRouterError';
  }
}

export class DirectRouterSwapAdapter implements SwapRouterPort {
  readonly id = 'direct-router';

  constructor(private readonly options: DirectRouterOptions) {
    if (options.feeBps > MAX_SWAP_FEE_BPS || options.feeBps < 0) {
      throw new DirectRouterError(
        `swap fee of ${options.feeBps} bps is outside the 0-${MAX_SWAP_FEE_BPS} range the ` +
          'FeeRouter enforces on chain',
      );
    }
  }

  /** Usable on any chain in the registry that has a V2-style DEX configured. */
  supports(chain: Caip2): boolean {
    try {
      return getChain(chain).dexes.length > 0;
    } catch {
      return false;
    }
  }

  async quote(request: QuoteRequest): Promise<Quote> {
    const { path, isNativeIn } = this.resolvePath(request);
    const dex = this.dexFor(request.chain);
    const reader = this.options.readerFor(request.chain);

    // The fee is taken from the input before it reaches the pool, so the routed amount is the
    // post-fee amount. Quoting the pre-fee amount would overstate the output every time.
    const fee = isNativeIn ? feeOn(request.sellAmount, BigInt(this.options.feeBps)) : 0n;
    const routedAmount = request.sellAmount - fee;

    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [routedAmount, path],
    });

    const raw = await reader.call(dex.router, data);
    if (raw === '0x') {
      throw new DirectRouterError(
        'the router returned no route; the pool may not exist yet for this pair',
      );
    }

    const [amounts] = decodeAbiParameters(parseAbiParameters('uint256[]'), raw);
    const buyAmount = amounts[amounts.length - 1];
    if (buyAmount === undefined || buyAmount === 0n) {
      throw new DirectRouterError('the router quoted zero output; there is no usable liquidity');
    }

    const fees: QuoteFee[] = [
      {
        kind: 'liquidityProvider',
        label: 'Pool fee',
        asset: request.sellAsset,
        // V2-style pools charge a flat 0.30% held inside the pool's own maths.
        amount: (routedAmount * 30n) / 10_000n,
        bps: 30n,
      },
    ];
    if (fee > 0n) {
      fees.push({
        kind: 'integrator',
        label: 'Platform fee',
        asset: request.sellAsset,
        amount: fee,
        bps: BigInt(this.options.feeBps),
      });
    }

    return {
      chain: request.chain,
      sellAsset: request.sellAsset,
      buyAsset: request.buyAsset,
      sellAmount: request.sellAmount,
      buyAmount,
      minBuyAmount: applySlippage(buyAmount, BigInt(request.slippageBps)),
      fees,
      estimatedPriceImpactBps: null,
      source: `${dex.id} (direct)`,
      expiresAt: null,
    };
  }

  async buildSwap(request: QuoteRequest, quote: Quote): Promise<TxBatch> {
    const { path, isNativeIn } = this.resolvePath(request);
    const dex = this.dexFor(request.chain);
    const reader = this.options.readerFor(request.chain);
    const deadline = BigInt((await reader.getBlockTimestamp()) + 600);

    const calls: TxRequest[] = [];

    if (isNativeIn) {
      const fee = feeOn(request.sellAmount, BigInt(this.options.feeBps));
      const routedAmount = request.sellAmount - fee;

      if (fee > 0n) {
        // Fee goes straight to the FeeRouter, whose on-chain cap bounds it regardless of what
        // this adapter was configured with.
        calls.push({
          chain: request.chain,
          to: getDeployment(request.chain).feeRouter,
          data: encodeFunctionData({
            abi: FEE_ROUTER_ABI,
            functionName: 'routeNative',
            args: [3, '0x0000000000000000000000000000000000000000'], // Product.Swap
          }),
          value: fee,
          summary: `Platform fee (${(this.options.feeBps / 100).toFixed(2)}%)`,
        });
      }

      calls.push({
        chain: request.chain,
        to: dex.router,
        data: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
          args: [quote.minBuyAmount, path, request.taker, deadline],
        }),
        value: routedAmount,
        summary: 'Swap through the DEX router',
      });
    } else {
      const sell = parseCaip19(request.sellAsset);
      const token = sell.assetReference as Address;

      calls.push({
        chain: request.chain,
        to: token,
        data: encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [dex.router, request.sellAmount],
        }),
        value: 0n,
        summary: 'Approve exactly the amount being sold',
      });

      calls.push({
        chain: request.chain,
        to: dex.router,
        data: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
          args: [request.sellAmount, quote.minBuyAmount, path, request.taker, deadline],
        }),
        value: 0n,
        summary: 'Swap through the DEX router',
      });
    }

    return {
      chain: request.chain,
      calls,
      summary: 'Swap tokens',
      // The fee transfer and the swap should land together. If they do not, the user has either
      // paid a fee with no swap or swapped without paying - both wrong, though neither loses
      // their principal.
      requiresAtomicity: isNativeIn && this.options.feeBps > 0,
    };
  }

  private dexFor(chain: Caip2) {
    return this.options.dexId ? getDex(chain, this.options.dexId) : defaultDex(chain);
  }

  /**
   * Build the swap path, using the chain's wrapped native token as the hop.
   *
   * Only single-hop native<->token routes are supported. Multi-hop routing is what aggregators
   * are for; attempting it here would mean reimplementing pathfinding badly.
   */
  private resolvePath(request: QuoteRequest): { path: readonly Address[]; isNativeIn: boolean } {
    const dex = this.dexFor(request.chain);
    const sell = parseCaip19(request.sellAsset);
    const buy = parseCaip19(request.buyAsset);

    const isNativeIn = sell.assetNamespace === 'slip44';
    const isNativeOut = buy.assetNamespace === 'slip44';

    if (isNativeIn && isNativeOut) {
      throw new DirectRouterError('cannot swap the native currency for itself');
    }
    if (!isNativeIn && !isNativeOut) {
      throw new DirectRouterError(
        'the direct router path handles native<->token swaps only; token-to-token needs an ' +
          'aggregator route',
      );
    }

    const token = (isNativeIn ? buy.assetReference : sell.assetReference) as Address;
    return {
      path: isNativeIn ? [dex.weth, token] : [token, dex.weth],
      isNativeIn,
    };
  }
}

/** Convenience for building the CAIP-19 of a chain's native currency. */
export function nativeAssetOf(chain: Caip2): string {
  return `${chain}/slip44:60`;
}

export { erc20Caip19 };
