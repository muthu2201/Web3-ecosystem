import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

const badge = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'border-ink-750 bg-ink-850/70 text-ink-300',
        flux: 'border-flux-600/40 bg-flux-600/12 text-flux-300',
        good: 'border-good-500/40 bg-good-500/12 text-good-400',
        warn: 'border-warn-500/40 bg-warn-500/12 text-warn-400',
        alert: 'border-alert-500/45 bg-alert-500/14 text-alert-400',
        sand: 'border-sand-500/40 bg-sand-500/12 text-sand-400',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/** A live dot, used where something is genuinely streaming rather than as decoration. */
export function PulseDot({ tone = 'good' }: { tone?: 'good' | 'warn' | 'flux' }): JSX.Element {
  const color = { good: 'bg-good-500', warn: 'bg-warn-500', flux: 'bg-flux-500' }[tone];
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', color)} />
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', color)} />
    </span>
  );
}
