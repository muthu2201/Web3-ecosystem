/**
 * Arithmetic helpers that mirror the Solidity implementations bit for bit.
 *
 * Every value is a `bigint`. Using `number` anywhere in this file would be a correctness bug:
 * a token balance of 1e27 wei exceeds `Number.MAX_SAFE_INTEGER` by nine orders of magnitude, so
 * a single implicit conversion silently corrupts the value.
 *
 * The functions here are differential-tested against the on-chain library in
 * `curve-math.differential.test.ts`, which runs the same randomised inputs through both and
 * requires exact equality. That test is the reason these can be trusted to quote a price the
 * chain will actually honour.
 */

/** Basis-point denominator, matching `BPS_DENOMINATOR` in the contracts. */
export const BPS_DENOMINATOR = 10_000n;

/** Maximum value of a uint256, for overflow assertions. */
export const MAX_UINT256 = (1n << 256n) - 1n;

export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathError';
  }
}

/**
 * Ceiling division, matching OpenZeppelin's `Math.ceilDiv`.
 *
 * The contracts use this to round reserves *up*, which rounds the user's side *down*. Getting
 * this wrong in either direction is not cosmetic: rounding the user's side up would let someone
 * buy and immediately sell in a loop, extracting a wei of curve reserves per iteration.
 */
export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new MathError('division by zero');
  return a === 0n ? 0n : (a - 1n) / b + 1n;
}

/** Floor division that rejects a zero denominator instead of returning Infinity. */
export function floorDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new MathError('division by zero');
  return a / b;
}

/**
 * Fee on `amount` at `bps`, rounded down.
 *
 * Matches `FeeRouter.feeOn`. Rounding down means the platform never charges a wei more than the
 * published rate, which is the direction a fee should err in.
 */
export function feeOn(amount: bigint, bps: bigint): bigint {
  assertNonNegative(amount, 'amount');
  assertNonNegative(bps, 'bps');
  return (amount * bps) / BPS_DENOMINATOR;
}

/** Amount remaining after the fee at `bps` is deducted. */
export function netOfFee(amount: bigint, bps: bigint): bigint {
  return amount - feeOn(amount, bps);
}

/**
 * Gross amount required for `net` to survive a `bps` fee, rounded up.
 *
 * Matches the partial-fill path in `BondingCurve.buy`, which grosses a known net cost back up so
 * the buyer pays the same rate on a smaller base rather than on their whole input.
 */
export function grossUpForFee(net: bigint, bps: bigint): bigint {
  assertNonNegative(net, 'net');
  if (bps === 0n) return net;
  if (bps >= BPS_DENOMINATOR) throw new MathError('fee bps must be below 100%');
  return ceilDiv(net * BPS_DENOMINATOR, BPS_DENOMINATOR - bps);
}

/** Proportional share of `amount` at `bps`, rounded down. */
export function shareOf(amount: bigint, bps: bigint): bigint {
  return feeOn(amount, bps);
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/** Clamp `value` into `[low, high]`. */
export function clamp(value: bigint, low: bigint, high: bigint): bigint {
  if (low > high) throw new MathError('clamp bounds inverted');
  return min(max(value, low), high);
}

export function assertNonNegative(value: bigint, label: string): void {
  if (value < 0n) throw new MathError(`${label} must not be negative`);
}

export function assertUint256(value: bigint, label: string): void {
  if (value < 0n || value > MAX_UINT256) throw new MathError(`${label} is out of uint256 range`);
}

/**
 * Format a raw token amount for display.
 *
 * Deliberately string-based rather than going through `Number`, so a large balance renders
 * exactly instead of losing its low-order digits to float precision.
 */
export function formatUnits(value: bigint, decimals: number, maxFractionDigits = decimals): string {
  if (decimals < 0) throw new MathError('decimals must not be negative');
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  let fractionStr = fraction.toString().padStart(decimals, '0');
  if (maxFractionDigits < decimals) fractionStr = fractionStr.slice(0, maxFractionDigits);
  fractionStr = fractionStr.replace(/0+$/, '');

  const sign = negative ? '-' : '';
  return fractionStr.length > 0 ? `${sign}${whole}.${fractionStr}` : `${sign}${whole}`;
}

/** Parse a decimal string into a raw token amount, rejecting anything lossy. */
export function parseUnits(value: string, decimals: number): bigint {
  if (decimals < 0) throw new MathError('decimals must not be negative');
  const trimmed = value.trim();
  if (!/^-?\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.' || trimmed === '-') {
    throw new MathError(`"${value}" is not a decimal number`);
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart = '', fractionPart = ''] = unsigned.split('.');

  if (fractionPart.length > decimals) {
    throw new MathError(
      `"${value}" has ${fractionPart.length} decimal places but the token has only ${decimals}`,
    );
  }

  const padded = fractionPart.padEnd(decimals, '0');
  const result = BigInt(`${wholePart || '0'}${padded || ''}`);
  return negative ? -result : result;
}

/** Apply a slippage tolerance to an expected output, producing a minimum acceptable amount. */
export function applySlippage(expected: bigint, slippageBps: bigint): bigint {
  assertNonNegative(expected, 'expected');
  if (slippageBps < 0n || slippageBps > BPS_DENOMINATOR) {
    throw new MathError('slippage must be between 0 and 10000 bps');
  }
  return (expected * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
}
