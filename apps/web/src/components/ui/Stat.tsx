import { cn } from '../../lib/cn.js';

/**
 * A labelled figure.
 *
 * Values render in tabular mono so a number does not reflow as it updates. In a price display,
 * digits that change width while you read them are a legibility bug, not a style choice.
 */
export function Stat({
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'flux' | 'good' | 'alert';
  className?: string;
}): JSX.Element {
  const valueTone = {
    default: 'text-ink-100',
    flux: 'text-flux-300',
    good: 'text-good-400',
    alert: 'text-alert-400',
  }[tone];

  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11.5px] font-medium uppercase tracking-[0.07em] text-ink-500">{label}</div>
      <div className={cn('mt-1 truncate font-mono text-[19px] leading-tight tabular', valueTone)}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-ink-500">{sub}</div>}
    </div>
  );
}

/** Progress bar with the fill clamped, so a value above 100% cannot overflow its track. */
export function Progress({
  value,
  max = 10_000,
  tone = 'flux',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'flux' | 'good' | 'sand';
  label?: React.ReactNode;
}): JSX.Element {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = { flux: 'bg-flux-500', good: 'bg-good-500', sand: 'bg-sand-500' }[tone];

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12px]">
          <span className="text-ink-400">{label}</span>
          <span className="font-mono tabular text-ink-200">{pct.toFixed(2)}%</span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-ink-850"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-[var(--radius-pill)] transition-[width] duration-700 ease-[var(--ease-out-expo)]', fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
