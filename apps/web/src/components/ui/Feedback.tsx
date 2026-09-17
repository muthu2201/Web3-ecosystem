import type { JSX } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';

import { cn } from '../../lib/cn.js';

/**
 * Inline message.
 *
 * Every tone pairs a colour with an icon and a word. Colour alone fails for roughly one in twelve
 * men, and this interface uses colour to distinguish "your money is at risk" from "this worked".
 */
export function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: 'info' | 'good' | 'warn' | 'alert';
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  const config = {
    info: { icon: Info, cls: 'border-flux-600/35 bg-flux-600/10 text-flux-300' },
    good: { icon: CheckCircle2, cls: 'border-good-500/35 bg-good-500/10 text-good-400' },
    warn: { icon: AlertTriangle, cls: 'border-warn-500/35 bg-warn-500/10 text-warn-400' },
    alert: { icon: OctagonAlert, cls: 'border-alert-500/40 bg-alert-500/12 text-alert-400' },
  }[tone];
  const Icon = config.icon;

  return (
    <div className={cn('flex gap-3 rounded-[10px] border p-3.5', config.cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-[13px] leading-relaxed">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-1', 'text-ink-300')}>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }): JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-700 border-t-flux-500',
        className,
      )}
    />
  );
}

/** Shimmer placeholder sized to the content it replaces, to avoid layout shift on load. */
export function Skeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[8px] bg-[linear-gradient(90deg,var(--color-ink-850),var(--color-ink-800),var(--color-ink-850))] bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  // Typed loosely on purpose: lucide's forwardRef components do not satisfy a strict
  // ComponentType<{ className: string }> under exactOptionalPropertyTypes, and narrowing the
  // prop here would mean every caller casting at the call site instead.
  icon: React.ComponentType<{ className?: string | undefined }>;
  title: React.ReactNode;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="rounded-[14px] border border-ink-800 bg-ink-900/60 p-3">
        <Icon className="h-5 w-5 text-ink-500" />
      </div>
      <div className="text-[15px] font-medium text-ink-200">{title}</div>
      {children && <p className="max-w-sm text-[13px] leading-relaxed text-ink-500">{children}</p>}
    </div>
  );
}
