/**
 * Bonding-curve launch and trading.
 *
 * Quotes are computed locally from on-chain reserves via `@web3eco/core`, which is
 * differential-tested against the Solidity library. That means the UI can price a trade with one
 * cheap read instead of an RPC round trip per keystroke, and the number it shows is the number
 * the chain will produce.
 */

import { getChain, getDeployment } from '@web3eco/chain-registry';
import type { Address, Caip2, CurveSnapshot, Hex, TxBatch, TxRequest } from '@web3eco/core';
import { applySlippage, type BuyQuote, quoteBuy, quoteSell, type SellQuote } from '@web3eco/core';
import type { BondingCurvePort, ChainReaderPort, CurveLaunchOptions } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { BondingCurveAbi, BondingCurveFactoryAbi, StandardTokenAbi } from './generated/index.js';
import { SdkError } from './reader.js';

/** Minimum LP lock the factory accepts, mirrored so the UI can reject early. */
const MIN_LP_LOCK_SECONDS = 30 * 24 * 60 * 60;

export class CurveOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurveOptionsError';
  }
}

export class BondingCurveAdapter implements BondingCurvePort {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  async buildLaunch(options: CurveLaunchOptions): Promise<TxRequest> {
    if (options.name.trim() === '') throw new CurveOptionsError('name must not be empty');
    if (options.symbol.trim() === '') throw new CurveOptionsError('symbol must not be empty');
    if (options.lockLpInsteadOfBurn && options.lpLockDurationSeconds < MIN_LP_LOCK_SECONDS) {
      throw new CurveOptionsError(
        `an LP lock must run for at least ${MIN_LP_LOCK_SECONDS / 86_400} days`,
      );
    }

    const { bondingCurveFactory } = getDeployment(options.chain);
    const deployFee = await this.readDeployFee(options.chain);

    const data = encodeFunctionData({
      abi: BondingCurveFactoryAbi,
      functionName: 'launch',
      args: [
        {
          name: options.name,
          symbol: options.symbol,
          lockLpInsteadOfBurn: options.lockLpInsteadOfBurn,
          lpLockDuration: BigInt(options.lpLockDurationSeconds),
          devBuyValue: options.devBuyValue,
          devBuyMinTokensOut: options.devBuyMinTokensOut,
          salt: options.salt,
        },
      ],
    });

    return {
      chain: options.chain,
      to: bondingCurveFactory,
      data,
      value: deployFee + options.devBuyValue,
      summary:
        `Launch ${options.symbol} on a bonding curve` +
        (options.devBuyValue > 0n ? ' with an opening buy' : ''),
    };
  }

  async buildBuy(
    chain: Caip2,
    curve: Address,
    nativeIn: bigint,
    minTokensOut: bigint,
    deadline: number,
  ): Promise<TxRequest> {
    if (nativeIn <= 0n) throw new CurveOptionsError('amount must be positive');
    return {
      chain,
      to: curve,
      data: encodeFunctionData({
        abi: BondingCurveAbi,
        functionName: 'buy',
        args: [minTokensOut, BigInt(deadline)],
      }),
      value: nativeIn,
      summary: `Buy from the bonding curve on ${getChain(chain).name}`,
    };
  }

  /**
   * Selling needs an allowance first, because the curve pulls the tokens rather than receiving
   * them. Returned as a batch so a wallet supporting EIP-5792 can do both in one prompt; wallets
   * that do not will be walked through them in order.
   *
   * The approval is for exactly `tokensIn`, not an unlimited allowance. An infinite approval to
   * any contract is a standing risk for as long as it exists, and there is no UX benefit here
   * since a sell is a one-off action.
   */
  async buildSell(
    chain: Caip2,
    curve: Address,
    tokensIn: bigint,
    minNativeOut: bigint,
    deadline: number,
  ): Promise<TxBatch> {
    if (tokensIn <= 0n) throw new CurveOptionsError('amount must be positive');
    const snapshot = await this.readCurve(chain, curve);

    const approve: TxRequest = {
      chain,
      to: snapshot.token,
      data: encodeFunctionData({
        abi: StandardTokenAbi,
        functionName: 'approve',
        args: [curve, tokensIn],
      }),
      value: 0n,
      summary: 'Approve the curve to take exactly the tokens being sold',
    };

    const sell: TxRequest = {
      chain,
      to: curve,
      data: encodeFunctionData({
        abi: BondingCurveAbi,
        functionName: 'sell',
        args: [tokensIn, minNativeOut, BigInt(deadline)],
      }),
      value: 0n,
      summary: 'Sell back to the bonding curve',
    };

    return {
      chain,
      calls: [approve, sell],
      summary: 'Sell tokens to the bonding curve',
      // Not strictly atomic-only: a stranded approval for an exact amount is harmless, and
      // forcing atomicity would exclude every wallet without EIP-5792 support.
      requiresAtomicity: false,
    };
  }

  /** Read the full curve state in one batched round trip. */
  async readCurve(chain: Caip2, curve: Address): Promise<CurveSnapshot> {
    const reader = this.readerFor(chain);
    // Field order here defines the decode order below; keep the two in step.
    const FIELDS = [
      'token',
      'creator',
      'pair',
      'virtualNativeReserve',
      'virtualTokenReserve',
      'realNativeReserve',
      'tokensSold',
      'curveSupply',
      'lpSupply',
      'graduated',
      'poolPreSeeded',
      'antiSnipeEndsAt',
      'maxBuyDuringWindow',
    ] as const;

    const results = await reader.multicall(
      FIELDS.map((functionName) => ({
        to: curve,
        data: encodeFunctionData({ abi: BondingCurveAbi, functionName }),
      })),
    );

    const addr = (i: number): Address => {
      const raw = results[i];
      if (!raw || raw === '0x') throw new SdkError(`curve ${curve} returned no data for field ${i}`);
      return decodeAbiParameters(parseAbiParameters('address'), raw)[0];
    };
    const num = (i: number): bigint => {
      const raw = results[i];
      if (!raw || raw === '0x') return 0n;
      return decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
    };
    const bool = (i: number): boolean => {
      const raw = results[i];
      if (!raw || raw === '0x') return false;
      return decodeAbiParameters(parseAbiParameters('bool'), raw)[0];
    };

    return {
      chain,
      curve,
      token: addr(0),
      creator: addr(1),
      pair: addr(2),
      virtualNativeReserve: num(3),
      virtualTokenReserve: num(4),
      realNativeReserve: num(5),
      tokensSold: num(6),
      curveSupply: num(7),
      lpSupply: num(8),
      graduated: bool(9),
      poolPreSeeded: bool(10),
      antiSnipeEndsAt: Number(num(11)),
      maxBuyDuringWindow: num(12),
    };
  }

  /**
   * Whether the factory on `chain` created this curve.
   *
   * Curves are runtime clones, so they cannot appear in a static deployment manifest. Anything
   * that needs to know a curve is genuine - the MCP server's guard rail above all - has to ask
   * the factory. Encoded from the generated ABI rather than a hand-written selector, because a
   * hand-written one is silently wrong until something reverts: the first attempt at this used
   * 0x2b3297f9 when the real selector is 0x927407ea.
   */
  async isPlatformCurve(chain: Caip2, curve: Address): Promise<boolean> {
    const reader = this.readerFor(chain);
    const { bondingCurveFactory } = getDeployment(chain);
    const data = encodeFunctionData({
      abi: BondingCurveFactoryAbi,
      functionName: 'isCurve',
      args: [curve],
    });
    const raw = await reader.call(bondingCurveFactory, data);
    if (raw === '0x') return false;
    return decodeAbiParameters(parseAbiParameters('bool'), raw)[0];
  }

  async predictCurveAddress(chain: Caip2, creator: Address, salt: Hex): Promise<Address> {
    const reader = this.readerFor(chain);
    const { bondingCurveFactory } = getDeployment(chain);
    const data = encodeFunctionData({
      abi: BondingCurveFactoryAbi,
      functionName: 'predictCurveAddress',
      args: [creator, salt],
    });
    const raw = await reader.call(bondingCurveFactory, data);
    if (raw === '0x') throw new SdkError('factory returned no address');
    return decodeAbiParameters(parseAbiParameters('address'), raw)[0];
  }

  async readDeployFee(chain: Caip2): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const data = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'flatNativeOf',
          stateMutability: 'view',
          inputs: [{ name: 'product', type: 'uint8' }],
          outputs: [{ type: 'uint256' }],
        },
      ] as const,
      functionName: 'flatNativeOf',
      args: [0],
    });
    const raw = await reader.call(feeRouter, data);
    return raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  }

  async readTradeFeeBps(chain: Caip2): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const data = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'bpsOf',
          stateMutability: 'view',
          inputs: [{ name: 'product', type: 'uint8' }],
          outputs: [{ type: 'uint16' }],
        },
      ] as const,
      functionName: 'bpsOf',
      args: [1], // Product.BondingCurveTrade
    });
    const raw = await reader.call(feeRouter, data);
    return raw === '0x' ? 0n : BigInt(decodeAbiParameters(parseAbiParameters('uint16'), raw)[0]);
  }

  /**
   * Quote a buy locally, then derive the slippage-protected minimum to submit.
   *
   * Computing this client-side rather than calling the contract's view function is what keeps a
   * live price display from issuing an RPC request on every keystroke — and the differential
   * tests are what make it safe to do so.
   */
  quoteBuyLocal(
    snapshot: CurveSnapshot,
    nativeIn: bigint,
    feeBps: bigint,
    slippageBps: bigint,
  ): BuyQuote & { minTokensOut: bigint } {
    const quote = quoteBuy(toCurveState(snapshot), nativeIn, feeBps);
    return { ...quote, minTokensOut: applySlippage(quote.tokensOut, slippageBps) };
  }

  quoteSellLocal(
    snapshot: CurveSnapshot,
    tokensIn: bigint,
    feeBps: bigint,
    slippageBps: bigint,
  ): SellQuote & { minNativeOut: bigint } {
    const quote = quoteSell(toCurveState(snapshot), tokensIn, feeBps);
    return { ...quote, minNativeOut: applySlippage(quote.nativeOut, slippageBps) };
  }
}

function toCurveState(s: CurveSnapshot) {
  return {
    virtualNativeReserve: s.virtualNativeReserve,
    virtualTokenReserve: s.virtualTokenReserve,
    realNativeReserve: s.realNativeReserve,
    tokensSold: s.tokensSold,
    curveSupply: s.curveSupply,
    graduated: s.graduated,
  };
}

export { MIN_LP_LOCK_SECONDS };

/**
 * Compute a transaction deadline from CHAIN time, not from the client's clock.
 *
 * `Date.now()` is the wrong basis for a deadline. A chain's timestamp can sit well ahead of or
 * behind wall-clock time — an L2 under load, a local fork that has been warped, a testnet whose
 * sequencer has drifted — and a deadline derived from the wrong clock either reverts instantly
 * as already-expired or silently disables the protection it was meant to provide. The user's
 * device clock being wrong should not be able to do either.
 *
 * One extra read is cheap; a swap that reverts on an expired deadline costs gas and a retry.
 */
export async function deadlineFromChain(
  reader: ChainReaderPort,
  secondsFromNow: number,
): Promise<number> {
  if (secondsFromNow <= 0) throw new CurveOptionsError('deadline must be in the future');
  const now = await reader.getBlockTimestamp();
  return now + secondsFromNow;
}
