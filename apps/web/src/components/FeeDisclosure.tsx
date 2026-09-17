/**
 * Itemised fee disclosure.
 *
 * A routed swap stacks an LP fee, the aggregator's own fee and the platform's integrator fee.
 * Showing only the platform's share understates what the user pays, and several front-ends have
 * been caught doing exactly that. This renders every line the quote reports and states the
 * ceiling the fee can never exceed, which is the claim the FeeRouter actually enforces.
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
  // Gas is excluded from the total because it is paid to validators, not to anyone in this
  // routing path, and folding it in would make the platform's take look larger than it is.
  const total = fees.filter((f) => f.kind !== 'network').reduce((sum, f) => sum + f.amount, 0n);

  return (
    <div className="rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
      <div className="text-[13px] font-semibold text-ink-200">What you pay</div>

      <dl className="mt-3 grid gap-1.5">
        {fees.map((fee) => (
          <div
            key={`${fee.kind}-${fee.label}`}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="min-w-0 text-[12.5px] text-ink-500">
              {KIND_LABEL[fee.kind]}
              {fee.bps !== null && ` (${(Number(fee.bps) / 100).toFixed(2)}%)`}
            </dt>
            <dd className="m-0 shrink-0 font-mono text-[12.5px] tabular text-ink-300">
              {formatUnits(fee.amount, decimals, 8)} {symbol}
            </dd>
          </div>
        ))}

        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-ink-850 pt-2.5">
          <dt className="text-[12.5px] font-semibold text-ink-200">Total fees, excluding gas</dt>
          <dd className="m-0 shrink-0 font-mono text-[13px] font-semibold tabular text-ink-100">
            {formatUnits(total, decimals, 8)} {symbol}
          </dd>
        </div>
      </dl>

      {hardCapBps !== undefined && (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
          The platform fee for this product can never exceed{' '}
          <strong className="text-ink-300">{(hardCapBps / 100).toFixed(2)}%</strong>. That ceiling
          is compiled into the fee contract and has no setter, so no operator action can raise it.
        </p>
      )}
    </div>
  );
}
