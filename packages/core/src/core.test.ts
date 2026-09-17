import { describe, expect, it } from 'vitest';

import { CaipError, erc20Caip19, evmCaip2, evmChainId, isEvm, parseCaip10, parseCaip19, parseCaip2, toCaip10 } from './caip.js';
import { applySlippage, ceilDiv, feeOn, formatUnits, grossUpForFee, MathError, parseUnits } from './math.js';
import { blockingFindings, decodeRiskFlags, isBondingCurveEligible, routabilityOf, worstSeverity } from './risk.js';
import { PRODUCTS, productOrdinal, RISK_FLAGS } from './types.js';

describe('ceilDiv matches OpenZeppelin Math.ceilDiv', () => {
  it('rounds up on any remainder and leaves exact division alone', () => {
    expect(ceilDiv(0n, 3n)).toBe(0n);
    expect(ceilDiv(1n, 3n)).toBe(1n);
    expect(ceilDiv(3n, 3n)).toBe(1n);
    expect(ceilDiv(4n, 3n)).toBe(2n);
    expect(ceilDiv(10n ** 30n, 7n)).toBe((10n ** 30n + 6n) / 7n);
  });

  it('rejects division by zero instead of returning Infinity', () => {
    expect(() => ceilDiv(1n, 0n)).toThrow(MathError);
  });
});

describe('fee maths', () => {
  it('rounds the fee down so the platform never over-charges', () => {
    expect(feeOn(10_000n, 25n)).toBe(25n);
    expect(feeOn(1n, 25n)).toBe(0n);
    expect(feeOn(3_999n, 25n)).toBe(9n); // 9.9975 truncates to 9
  });

  it('grosses a net amount back up so the same rate applies to a smaller base', () => {
    // The inverse must always cover the fee: grossing up then taking the fee leaves at least net.
    for (const bps of [0n, 1n, 25n, 100n, 150n, 300n, 999n]) {
      for (const net of [1n, 7n, 1_000n, 10n ** 18n, 12_345_678_901n]) {
        const gross = grossUpForFee(net, bps);
        expect(gross - feeOn(gross, bps)).toBeGreaterThanOrEqual(net);
      }
    }
  });

  it('refuses a fee of 100% or more, which has no finite gross-up', () => {
    expect(() => grossUpForFee(1n, 10_000n)).toThrow(MathError);
  });

  it('applies slippage downward and rejects impossible tolerances', () => {
    expect(applySlippage(1_000n, 100n)).toBe(990n);
    expect(applySlippage(1_000n, 0n)).toBe(1_000n);
    expect(() => applySlippage(1_000n, 10_001n)).toThrow(MathError);
  });
});

describe('unit formatting is exact at token scale', () => {
  it('round-trips values far beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = 123_456_789_012_345_678_901_234_567_890n;
    expect(parseUnits(formatUnits(huge, 18), 18)).toBe(huge);
  });

  it('does not lose low-order digits the way a float conversion would', () => {
    const value = 1_000_000_000_000_000_000_000_001n; // 1e24 + 1
    expect(formatUnits(value, 18)).toBe('1000000.000000000000000001');
  });

  it('formats and trims correctly around zero and whole numbers', () => {
    expect(formatUnits(0n, 18)).toBe('0');
    expect(formatUnits(10n ** 18n, 18)).toBe('1');
    expect(formatUnits(15n * 10n ** 17n, 18)).toBe('1.5');
    expect(formatUnits(-15n * 10n ** 17n, 18)).toBe('-1.5');
  });

  it('rejects input with more precision than the token has, rather than silently truncating', () => {
    expect(() => parseUnits('1.1234567', 6)).toThrow(MathError);
    expect(parseUnits('1.123456', 6)).toBe(1_123_456n);
  });

  it('rejects malformed numeric input', () => {
    for (const bad of ['', '.', '-', 'abc', '1.2.3', '1e18']) {
      expect(() => parseUnits(bad, 18)).toThrow(MathError);
    }
  });
});

describe('CAIP identifiers', () => {
  it('builds and reads EVM chain ids', () => {
    expect(evmCaip2(8453)).toBe('eip155:8453');
    expect(evmChainId('eip155:8453')).toBe(8453);
    expect(isEvm('eip155:56')).toBe(true);
    expect(isEvm('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(false);
  });

  it('refuses to invent a numeric chain id for a non-EVM chain', () => {
    // Returning something plausible here is how a Solana asset ends up routed to an EVM adapter.
    expect(() => evmChainId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as never)).toThrow(CaipError);
  });

  it('parses accounts and assets', () => {
    expect(parseCaip2('eip155:1')).toEqual({ namespace: 'eip155', reference: '1' });
    expect(parseCaip10('eip155:1:0xabc')).toEqual({ chain: 'eip155:1', address: '0xabc' });
    expect(toCaip10('eip155:1', '0xabc')).toBe('eip155:1:0xabc');

    const asset = parseCaip19('eip155:8453/erc20:0xAbC');
    expect(asset.chain).toBe('eip155:8453');
    expect(asset.assetNamespace).toBe('erc20');

    const nft = parseCaip19('eip155:8453/erc721:0xAbC/42');
    expect(nft.tokenId).toBe('42');
  });

  it('lower-cases token addresses so the same asset has one canonical id', () => {
    expect(erc20Caip19('eip155:8453', '0xAbCdEf0000000000000000000000000000000000')).toBe(
      'eip155:8453/erc20:0xabcdef0000000000000000000000000000000000',
    );
  });

  it('rejects malformed identifiers', () => {
    for (const bad of ['eip155', 'eip155:', ':1', 'e:1', 'eip155:1:2:3:4']) {
      expect(() => parseCaip2(bad)).toThrow(CaipError);
    }
  });
});

describe('risk decoding', () => {
  it('reports nothing for a token with no privileged powers', () => {
    expect(decodeRiskFlags(RISK_FLAGS.NONE)).toEqual([]);
    expect(worstSeverity([])).toBe('none');
  });

  it('ranks seizure and freeze powers as critical, dilution as a warning', () => {
    const findings = decodeRiskFlags(RISK_FLAGS.CLAWBACK | RISK_FLAGS.MINTABLE | RISK_FLAGS.CAPPED);
    expect(findings[0]?.severity).toBe('critical');
    expect(findings[0]?.code).toBe('CLAWBACK');
    expect(worstSeverity(findings)).toBe('critical');
    expect(blockingFindings(findings).map((f) => f.code)).toEqual(['CLAWBACK']);
  });

  it('decodes the full compliance-token mask the contract publishes', () => {
    const mask =
      RISK_FLAGS.CLAWBACK |
      RISK_FLAGS.BLOCKLIST |
      RISK_FLAGS.PAUSABLE |
      RISK_FLAGS.MINTABLE |
      RISK_FLAGS.OWNED;
    const codes = decodeRiskFlags(mask).map((f) => f.code);
    expect(codes).toContain('CLAWBACK');
    expect(codes).toContain('BLOCKLIST');
    expect(codes).toContain('PAUSABLE');
    expect(codes).toContain('MINTABLE');
    expect(codes).toContain('OWNED');
  });

  it('allows only the standard template onto a bonding curve', () => {
    expect(isBondingCurveEligible('standard')).toBe(true);
    for (const t of ['mintable', 'pausable', 'governance', 'tax', 'compliance'] as const) {
      expect(isBondingCurveEligible(t)).toBe(false);
    }
  });

  it('flags taxed tokens as having limited routability', () => {
    const taxed = routabilityOf(RISK_FLAGS.TAXED);
    expect(taxed.full).toBe(false);
    expect(taxed.allowedPoolTypes).not.toContain('uniswap-v3');

    const plain = routabilityOf(RISK_FLAGS.NONE);
    expect(plain.full).toBe(true);
    expect(plain.allowedPoolTypes).toContain('uniswap-v3');
  });
});

describe('product ordinals match the on-chain enum', () => {
  it('keeps the order the FeeRouter ABI depends on', () => {
    // Reordering this array would silently point every fee lookup at the wrong product.
    expect(PRODUCTS).toEqual([
      'tokenDeploy',
      'bondingCurveTrade',
      'graduation',
      'swap',
      'presale',
      'fairLaunch',
      'nftDeploy',
      'nftMint',
      'nftMarketplace',
    ]);
    expect(productOrdinal('tokenDeploy')).toBe(0);
    expect(productOrdinal('bondingCurveTrade')).toBe(1);
    expect(productOrdinal('nftMarketplace')).toBe(8);
  });
});
