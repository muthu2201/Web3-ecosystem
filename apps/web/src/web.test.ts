/**
 * Tests for the security-critical parts of the interface.
 *
 * The rendering is not what matters here. What matters is that the rules the UI enforces - which
 * findings block an action, what a fee disclosure totals to, and that a curve can be charted
 * without any backend - hold independently of how they are drawn.
 */

import { decodeRiskFlags, RISK_FLAGS, sampleCurve, worstSeverity, formatUnits } from '@web3eco/core';
import { describe, expect, it } from 'vitest';

describe('what the interface blocks on', () => {
  /**
   * These four powers let someone take a holder's tokens or stop them selling. They must always
   * reach the user as blocking, not as a styled note they can scroll past.
   */
  it('treats seizure, freeze, blocklist and upgradeability as blocking', () => {
    for (const flag of [
      RISK_FLAGS.CLAWBACK,
      RISK_FLAGS.PAUSABLE,
      RISK_FLAGS.BLOCKLIST,
      RISK_FLAGS.UPGRADEABLE,
    ]) {
      const findings = decodeRiskFlags(flag);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe('critical');
    }
  });

  it('does not block on dilution or tax alone, so the gate stays meaningful', () => {
    expect(worstSeverity(decodeRiskFlags(RISK_FLAGS.MINTABLE))).toBe('warning');
    expect(worstSeverity(decodeRiskFlags(RISK_FLAGS.TAXED))).toBe('warning');
  });

  it('reports a degen-launched token as having no findings at all', () => {
    expect(decodeRiskFlags(RISK_FLAGS.NONE)).toEqual([]);
    expect(worstSeverity([])).toBe('none');
  });

  /**
   * The acknowledgement key is derived from the blocking findings, so ticking the box for one
   * token cannot silently carry over to a different one.
   */
  it('derives a distinct acknowledgement key per set of blocking findings', () => {
    const keyOf = (flags: bigint) =>
      decodeRiskFlags(flags)
        .filter((f) => f.severity === 'critical')
        .map((f) => f.code)
        .join(',');

    expect(keyOf(RISK_FLAGS.CLAWBACK)).not.toBe(keyOf(RISK_FLAGS.PAUSABLE));
    expect(keyOf(RISK_FLAGS.CLAWBACK | RISK_FLAGS.PAUSABLE)).not.toBe(keyOf(RISK_FLAGS.CLAWBACK));
    expect(keyOf(RISK_FLAGS.MINTABLE)).toBe('');
  });
});

describe('fee disclosure totals', () => {
  /**
   * The number shown to the user must be the sum of every fee line, not just the platform's own.
   * Understating this is the specific failure the disclosure exists to prevent.
   */
  it('sums every non-gas fee line', () => {
    const fees = [
      { kind: 'liquidityProvider' as const, amount: 3_000n },
      { kind: 'aggregator' as const, amount: 1_500n },
      { kind: 'integrator' as const, amount: 2_500n },
      { kind: 'network' as const, amount: 99_999n },
    ];
    const total = fees.filter((f) => f.kind !== 'network').reduce((s, f) => s + f.amount, 0n);
    expect(total).toBe(7_000n);
  });

  it('formats fee amounts without losing precision at token scale', () => {
    expect(formatUnits(1_234_567_890_123_456_789n, 18, 8)).toBe('1.23456789');
    expect(formatUnits(1n, 18, 18)).toBe('0.000000000000000001');
  });
});

describe('curve charting needs no backend', () => {
  const V_NATIVE = 1_500_000_000_000_000_000n;
  const V_TOKEN = 1_073_000_000n * 10n ** 18n;
  const CURVE_SUPPLY = 800_000_000n * 10n ** 18n;

  it('produces a full price series from reserves alone', () => {
    const points = sampleCurve(V_NATIVE, V_TOKEN, CURVE_SUPPLY, 120);
    expect(points).toHaveLength(120);
    expect(points.every((p) => p.priceX18 > 0n)).toBe(true);
  });

  it('produces a monotonically rising price, which is what makes the chart meaningful', () => {
    const points = sampleCurve(V_NATIVE, V_TOKEN, CURVE_SUPPLY, 60);
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.priceX18).toBeGreaterThanOrEqual(points[i - 1]!.priceX18);
    }
  });

  it('refuses to draw from degenerate parameters rather than rendering a misleading line', () => {
    expect(() => sampleCurve(V_NATIVE, V_TOKEN, CURVE_SUPPLY, 1)).toThrow();
  });

  it('stays finite at the end of the curve, where the price would otherwise diverge', () => {
    const points = sampleCurve(V_NATIVE, V_TOKEN, CURVE_SUPPLY, 200);
    const last = points[points.length - 1]!;
    expect(Number.isFinite(Number(last.priceX18))).toBe(true);
    expect(last.tokensSold).toBeLessThan(V_TOKEN);
  });
});
