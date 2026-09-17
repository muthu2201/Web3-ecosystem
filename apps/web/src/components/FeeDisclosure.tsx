/**
 * Itemised fee disclosure.
 *
 * A routed swap stacks an LP fee, the aggregator's own fee and the platform's integrator fee.
 * Showing only the platform's share understates what the user pays, and several front-ends have
 * been caught doing exactly that. This renders every line the quote reports and states the
 * ceiling that the fee can never exceed, which is the claim the FeeRouter actually enforces.
 */

import type { QuoteFee } from '@web3eco/core';
import { formatUnits } from '@web3eco/core';

const KIND_LABEL: Record<QuoteFee['kind'], string> = {
  liquidityProvider: 'Liquidity provider fee',
  aggregator: 'Router fee',
  integrator: 'Platform fee',
  network: 'Estimated network fee',
  royalty: 'Creator royalty',
};

export function FeeDisclosure({
  fees,
  decimals,
  symbol,
  hardCapBps,
}: {
  fees: readonly QuoteFee[];
  decimals: number;
  symbol: string;
  hardCapBps?: number;
}): JSX.Element {
  const total = fees
    .filter((f) => f.kind !== 'network')
    .reduce((sum, f) => sum + f.amount, 0n);

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 6, padding: 12, fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>What you pay</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {fees.map((fee) => (
            <tr key={`${fee.kind}-${fee.label}`}>
              <td style={{ padding: '3px 0', opacity: 0.85 }}>
                {KIND_LABEL[fee.kind]}
                {fee.bps !== null && ` (${(Number(fee.bps) / 100).toFixed(2)}%)`}
              </td>
              <td style={{ padding: '3px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatUnits(fee.amount, decimals, 8)} {symbol}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid #2a2a2a', fontWeight: 600 }}>
            <td style={{ padding: '6px 0' }}>Total fees (excluding gas)</td>
            <td style={{ padding: '6px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatUnits(total, decimals, 8)} {symbol}
            </td>
          </tr>
        </tbody>
      </table>

      {hardCapBps !== undefined && (
        <p style={{ margin: '10px 0 0', opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
          The platform fee for this product can never exceed{' '}
          <strong>{(hardCapBps / 100).toFixed(2)}%</strong>. That ceiling is compiled into the fee
          contract and has no setter, so no operator action can raise it.
        </p>
      )}
    </div>
  );
}
