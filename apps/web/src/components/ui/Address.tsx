import { Check, Copy } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';

import { cn } from '../../lib/cn.js';

/**
 * Truncated address with copy.
 *
 * Shows the leading and trailing characters, which is what people actually compare when checking
 * an address against a block explorer or a wallet prompt. The full value is always in `title` and
 * on the clipboard, so truncation never loses information.
 */
export function Address({
  value,
  chars = 6,
  className,
  href,
}: {
  value: string;
  chars?: number;
  className?: string;
  href?: string;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const short = value.length > chars * 2 + 2 ? `${value.slice(0, chars)}…${value.slice(-4)}` : value;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard is unavailable over plain HTTP and in some embedded webviews. The title
      // attribute still carries the full value, so the user can select it manually.
    }
  }

  const label = (
    <span className="font-mono text-[13px] tabular" title={value}>
      {short}
    </span>
  );

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-flux-300 hover:underline">
          {label}
        </a>
      ) : (
        label
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Address copied' : 'Copy address'}
        className="rounded-[var(--radius-hair)] p-1 text-ink-500 transition-colors hover:bg-ink-850 hover:text-ink-200"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-good-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
