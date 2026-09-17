/**
 * Bonding-curve pricing, mirroring `contracts/src/libraries/CurveMath.sol` exactly.
 *
 * This file exists so the UI can quote a trade without an RPC round trip and without the chain
 * disagreeing with what the user was shown. Every function here has the same rounding direction
 * as its Solidity counterpart, and `curve.differential.test.ts` runs randomised inputs through
 * both implementations demanding exact equality.
 *
 * Rounding always favours the pool: tokens out and native out round DOWN, native in rounds UP.
 * See the Solidity file for why that is a security property rather than a style choice.
 */

import { BPS_DENOMINATOR, ceilDiv, MathError } from './math.js';

export interface CurveState {
  /** Current virtual native reserve, in wei. */
  readonly virtualNativeReserve: bigint;
  /** Current virtual token reserve, in the token's smallest unit. */
  readonly virtualTokenReserve: bigint;
  /** Native actually collected so far, in wei. */
  readonly realNativeReserve: bigint;
  /** Tokens sold so far. */
  readonly tokensSold: bigint;
  /** Total tokens offered on the curve. */
  readonly curveSupply: bigint;
  /** Whether the curve has already migrated to a DEX pool. */
  readonly graduated: boolean;
}

export interface BuyQuote {
  /** Tokens the buyer receives. */
  readonly tokensOut: bigint;
  /** Platform fee taken from the input, in wei. */
  readonly fee: bigint;
  /** Input actually spent, in wei. Below the requested amount on a partial fill. */
  readonly nativeSpent: bigint;
  /** Unused input returned to the buyer, in wei. */
  readonly refund: bigint;
  /** True when the buy would exhaust the curve and trigger graduation. */
  readonly completesCurve: boolean;
  /** Effective price per whole token, scaled by 1e18. */
  readonly effectivePriceX18: bigint;
}

export interface SellQuote {
  /** Native the seller receives after fees, in wei. */
  readonly nativeOut: bigint;
  /** Platform fee taken from the proceeds, in wei. */
  readonly fee: bigint;
  /** Effective price per whole token, scaled by 1e18. */
  readonly effectivePriceX18: bigint;
}

export class CurveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurveError';
  }
}

const WAD = 10n ** 18n;

function requireReserves(virtualNative: bigint, virtualToken: bigint): void {
  if (virtualNative <= 0n || virtualToken <= 0n) {
    throw new CurveError('curve reserves must be positive');
  }
}

/** Tokens received for spending `nativeIn` (already net of fees). Rounds down. */
export function tokensOutForNativeIn(
  virtualNative: bigint,
  virtualToken: bigint,
  nativeIn: bigint,
): bigint {
  requireReserves(virtualNative, virtualToken);
  if (nativeIn < 0n) throw new CurveError('nativeIn must not be negative');
  if (nativeIn === 0n) return 0n;

  const k = virtualNative * virtualToken;
  const newVirtualNative = virtualNative + nativeIn;
  // Round the remaining token reserve UP, which rounds the user's output DOWN.
  const newVirtualToken = ceilDiv(k, newVirtualNative);
  if (newVirtualToken >= virtualToken) return 0n;
  return virtualToken - newVirtualToken;
}

/** Native received for selling `tokensIn`, before fees. Rounds down. */
export function nativeOutForTokensIn(
  virtualNative: bigint,
  virtualToken: bigint,
  tokensIn: bigint,
): bigint {
  requireReserves(virtualNative, virtualToken);
  if (tokensIn < 0n) throw new CurveError('tokensIn must not be negative');
  if (tokensIn === 0n) return 0n;

  const k = virtualNative * virtualToken;
  const newVirtualToken = virtualToken + tokensIn;
  // Round the remaining native reserve UP, which rounds the user's output DOWN.
  const newVirtualNative = ceilDiv(k, newVirtualToken);
  if (newVirtualNative >= virtualNative) return 0n;
  return virtualNative - newVirtualNative;
}

/** Native required to buy exactly `tokensOut`, before fees. Rounds up. */
export function nativeInForExactTokensOut(
  virtualNative: bigint,
  virtualToken: bigint,
  tokensOut: bigint,
): bigint {
  requireReserves(virtualNative, virtualToken);
  if (tokensOut < 0n) throw new CurveError('tokensOut must not be negative');
  if (tokensOut === 0n) return 0n;
  if (tokensOut >= virtualToken) {
    throw new CurveError('cannot buy the entire virtual reserve: the price is unbounded');
  }

  const k = virtualNative * virtualToken;
  const newVirtualToken = virtualToken - tokensOut;
  // Round the new native reserve UP, which rounds the user's required input UP.
  const newVirtualNative = ceilDiv(k, newVirtualToken);
  return newVirtualNative - virtualNative;
}

/** Marginal price of one whole token in native wei, scaled by 1e18. Display only. */
export function spotPriceX18(virtualNative: bigint, virtualToken: bigint, tokenUnit = WAD): bigint {
  if (virtualToken <= 0n) throw new CurveError('curve reserves must be positive');
  return (virtualNative * tokenUnit) / virtualToken;
}

/**
 * Quote a buy, reproducing `BondingCurve.buy` including its partial-fill behaviour.
 *
 * When the requested amount would overrun the remaining curve supply, the fill is clamped to what
 * is left, the cost of exactly that much is computed, the fee is grossed back up against the
 * smaller base, and the difference is refunded. Reproducing this here rather than approximating
 * it is what lets the UI show the true refund before the user signs.
 */
export function quoteBuy(state: CurveState, nativeIn: bigint, feeBps: bigint): BuyQuote {
  if (state.graduated) throw new CurveError('curve has graduated: trade on the DEX pool instead');
  if (nativeIn <= 0n) throw new CurveError('nativeIn must be positive');

  const remaining = state.curveSupply - state.tokensSold;
  if (remaining <= 0n) throw new CurveError('curve supply is exhausted');

  let grossUsed = nativeIn;
  let fee = (grossUsed * feeBps) / BPS_DENOMINATOR;
  let netIn = grossUsed - fee;
  let tokensOut = tokensOutForNativeIn(state.virtualNativeReserve, state.virtualTokenReserve, netIn);
  let refund = 0n;

  if (tokensOut > remaining) {
    tokensOut = remaining;
    netIn = nativeInForExactTokensOut(
      state.virtualNativeReserve,
      state.virtualTokenReserve,
      tokensOut,
    );
    grossUsed =
      feeBps === 0n ? netIn : ceilDiv(netIn * BPS_DENOMINATOR, BPS_DENOMINATOR - feeBps);

    if (grossUsed > nativeIn) {
      // Rounding pushed the grossed-up cost past what was offered; spend everything instead,
      // which can only deliver fewer tokens than `remaining`.
      grossUsed = nativeIn;
      fee = (grossUsed * feeBps) / BPS_DENOMINATOR;
      netIn = grossUsed - fee;
      tokensOut = tokensOutForNativeIn(
        state.virtualNativeReserve,
        state.virtualTokenReserve,
        netIn,
      );
    } else {
      fee = grossUsed - netIn;
    }
    refund = nativeIn - grossUsed;
  }

  if (tokensOut <= 0n) throw new CurveError('input too small to buy any tokens');

  return {
    tokensOut,
    fee,
    nativeSpent: grossUsed,
    refund,
    completesCurve: state.tokensSold + tokensOut >= state.curveSupply,
    effectivePriceX18: (grossUsed * WAD) / tokensOut,
  };
}

/** Quote a sell, reproducing `BondingCurve.sell`. */
export function quoteSell(state: CurveState, tokensIn: bigint, feeBps: bigint): SellQuote {
  if (state.graduated) throw new CurveError('curve has graduated: trade on the DEX pool instead');
  if (tokensIn <= 0n) throw new CurveError('tokensIn must be positive');
  if (tokensIn > state.tokensSold) {
    throw new CurveError('cannot sell more tokens than the curve has ever sold');
  }

  const gross = nativeOutForTokensIn(
    state.virtualNativeReserve,
    state.virtualTokenReserve,
    tokensIn,
  );
  if (gross <= 0n) throw new CurveError('amount too small to return any native currency');
  if (gross > state.realNativeReserve) {
    throw new CurveError('curve does not hold enough native currency for this sale');
  }

  const fee = (gross * feeBps) / BPS_DENOMINATOR;
  const nativeOut = gross - fee;

  return { nativeOut, fee, effectivePriceX18: (nativeOut * WAD) / tokensIn };
}

/**
 * Native the curve will hold at graduation, derivable before the first trade.
 *
 * Because this is a pure function of the launch parameters, the graduation target is knowable and
 * verifiable in advance rather than being a threshold an operator can move.
 */
export function graduationTarget(state: CurveState): bigint {
  const outstanding = state.curveSupply - state.tokensSold;
  if (outstanding <= 0n) return state.realNativeReserve;
  return (
    nativeInForExactTokensOut(state.virtualNativeReserve, state.virtualTokenReserve, outstanding) +
    state.realNativeReserve
  );
}

/** Fraction of the curve sold so far, in basis points. */
export function progressBps(state: CurveState): bigint {
  if (state.curveSupply === 0n) return 0n;
  return (state.tokensSold * BPS_DENOMINATOR) / state.curveSupply;
}

/**
 * Sample the curve into points for a chart.
 *
 * Deliberately computed from reserves rather than fetched from an indexer: the live curve price
 * is a pure function of on-chain state, so charting it needs no backend, no database and no
 * historical API. Sampling cost is O(points), independent of trade history.
 */
export function sampleCurve(
  virtualNativeStart: bigint,
  virtualTokenStart: bigint,
  curveSupply: bigint,
  points: number,
): Array<{ tokensSold: bigint; priceX18: bigint; nativeRaised: bigint }> {
  if (points < 2) throw new CurveError('need at least two points to draw a curve');

  const out: Array<{ tokensSold: bigint; priceX18: bigint; nativeRaised: bigint }> = [];
  for (let i = 0; i < points; i++) {
    const sold = (curveSupply * BigInt(i)) / BigInt(points - 1);
    // The final point would require buying the whole reserve, which has unbounded price; step
    // just short of it so the chart stays finite.
    const safeSold = sold >= virtualTokenStart ? virtualTokenStart - 1n : sold;
    const raised =
      safeSold === 0n
        ? 0n
        : nativeInForExactTokensOut(virtualNativeStart, virtualTokenStart, safeSold);
    const vNative = virtualNativeStart + raised;
    const vToken = virtualTokenStart - safeSold;
    out.push({ tokensSold: safeSold, priceX18: spotPriceX18(vNative, vToken), nativeRaised: raised });
  }
  return out;
}

export { MathError };
