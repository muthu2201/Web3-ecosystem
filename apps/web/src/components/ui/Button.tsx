import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

/**
 * Buttons.
 *
 * `primary` is deliberately the only variant that uses the accent colour. If every button glows,
 * none of them tells you which one commits the transaction — in an interface where one button
 * spends money and the rest do not, that distinction is the whole point.
 */
const button = cva(
  'relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
    'transition-all duration-200 ease-[var(--ease-out-expo)] ' +
    'disabled:pointer-events-none disabled:opacity-40 ' +
    'active:translate-y-px select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-flux-500 text-ink-950 font-semibold ' +
          'shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_6px_20px_-6px_color-mix(in_oklch,var(--color-flux-500)_60%,transparent)] ' +
          'hover:bg-flux-400 hover:shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_28px_-8px_color-mix(in_oklch,var(--color-flux-500)_70%,transparent)]',
        glass:
          'glass text-ink-100 hover:border-[color-mix(in_oklch,var(--color-ink-100)_18%,transparent)] ' +
          'hover:bg-[color-mix(in_oklch,var(--color-ink-100)_8%,transparent)]',
        ghost: 'text-ink-300 hover:text-ink-100 hover:bg-[color-mix(in_oklch,var(--color-ink-100)_6%,transparent)]',
        danger: 'bg-alert-600 text-ink-100 font-semibold hover:bg-alert-500',
        outline:
          'border border-ink-700 text-ink-200 hover:border-flux-500 hover:text-flux-300 bg-transparent',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-[var(--radius-hair)]',
        md: 'h-10 px-4 text-sm rounded-[10px]',
        lg: 'h-12 px-6 text-[15px] rounded-[12px]',
        icon: 'h-10 w-10 rounded-[10px]',
        pill: 'h-9 px-4 text-[13px] rounded-[var(--radius-pill)]',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'glass', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

/**
 * The button's styles, exposed so a `<Link>` can wear them.
 *
 * Putting a `<Link>` inside a `<button>` is invalid HTML and breaks keyboard and screen-reader
 * behaviour, so anything that navigates renders as an anchor with these classes instead.
 */
export const buttonClass = button;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(button({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
