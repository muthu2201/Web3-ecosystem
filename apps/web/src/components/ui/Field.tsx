import type { JSX } from 'react';
import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

const base =
  'w-full min-w-0 rounded-[10px] border border-ink-800 bg-ink-900/60 px-3.5 text-[15px] ' +
  'text-ink-100 placeholder:text-ink-600 transition-colors duration-150 ' +
  'hover:border-ink-700 focus:border-flux-500 focus:outline-none ' +
  'focus:ring-[3px] focus:ring-[color-mix(in_oklch,var(--color-flux-500)_18%,transparent)] ' +
  'disabled:opacity-45';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly hint?: React.ReactNode;
  readonly error?: string | null;
  readonly suffix?: React.ReactNode;
  readonly mono?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, suffix, mono, className, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;

    return (
      <div className="min-w-0">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={cn(
              base,
              'h-11',
              mono && 'font-mono text-[13.5px]',
              suffix && 'pr-16',
              error && 'border-alert-500 focus:border-alert-500 focus:ring-alert-500/20',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 font-mono text-[12px] text-ink-500">
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-[12px] leading-relaxed text-alert-400">{error}</p>
        ) : (
          hint && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{hint}</p>
        )}
      </div>
    );
  },
);
Field.displayName = 'Field';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string;
  readonly hint?: React.ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, hint, className, id, children, ...props }, ref) => {
    const generated = useId();
    const selectId = id ?? generated;

    return (
      <div className="min-w-0">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-medium text-ink-300">
            {label}
          </label>
        )}
        <select ref={ref} id={selectId} className={cn(base, 'h-11 appearance-none pr-9', className)} {...props}>
          {children}
        </select>
        {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{hint}</p>}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';

/** Checkbox with the label as the hit target, which matters most on touch. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5 transition-colors hover:border-ink-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-flux-500)]"
      />
      <span className="min-w-0">
        <span className="block text-[14px] text-ink-100">{label}</span>
        {hint && <span className="mt-1 block text-[12px] leading-relaxed text-ink-500">{hint}</span>}
      </span>
    </label>
  );
}
