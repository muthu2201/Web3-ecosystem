import type { JSX } from 'react';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

/**
 * Surface.
 *
 * `tone="lit"` burns the domain hue along the top edge and washes it faintly into the panel, and
 * is reserved for the panel holding the page's primary action — a user scanning a dense page finds
 * it without reading. The hue comes from `--neon`, so the same component marks a launch magenta
 * and a swap cyan.
 */
export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: 'default' | 'strong' | 'lit';
  readonly inset?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, tone = 'default', inset = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-panel)]',
        tone === 'lit' ? 'lit' : tone === 'strong' ? 'glass-strong' : 'glass',
        inset && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = 'Panel';

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
