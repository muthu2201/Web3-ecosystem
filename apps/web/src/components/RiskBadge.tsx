/**
 * Risk disclosure.
 *
 * Warnings here are unskippable and in plain language, because the pattern being defended against
 * is a user buying a token whose contract lets someone else take it back. Critical findings are
 * deliberately not styled subtly: a power that lets an account seize a balance is not a footnote.
 *
 * Every severity pairs a colour with an icon and a word. Colour alone fails for roughly one in
 * twelve men, and this component uses colour to distinguish "your money is at risk" from "this is
 * fine".
 */

import type { RiskFinding, RiskSeverity } from '@web3eco/core';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';

import { cn } from '../lib/cn.js';

const SEVERITY = {
  critical: {
    label: 'Critical',
    icon: OctagonAlert,
    chip: 'border-alert-500/45 bg-alert-500/14 text-alert-400',
    card: 'border-alert-500/40 bg-alert-500/8',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    chip: 'border-warn-500/40 bg-warn-500/12 text-warn-400',
    card: 'border-warn-500/35 bg-warn-500/7',
  },
  info: {
    label: 'Note',
    icon: Info,
    chip: 'border-flux-600/40 bg-flux-600/12 text-flux-300',
    card: 'border-flux-600/30 bg-flux-600/7',
  },
  none: {
    label: 'No findings',
    icon: CheckCircle2,
    chip: 'border-good-500/40 bg-good-500/12 text-good-400',
    card: 'border-good-500/35 bg-good-500/7',
  },
} as const satisfies Record<RiskSeverity, unknown>;

export function RiskBadge({ severity }: { severity: RiskSeverity }): JSX.Element {
  const config = SEVERITY[severity];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide',
        config.chip,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </span>
  );
}

export function RiskFindings({ findings }: { findings: readonly RiskFinding[] }): JSX.Element {
  if (findings.length === 0) {
    const Icon = SEVERITY.none.icon;
    return (
      <div className={cn('flex gap-3 rounded-[10px] border p-3.5', SEVERITY.none.card)}>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-good-400" aria-hidden />
        <div className="min-w-0 text-[13px] leading-relaxed">
          <div className="font-semibold text-good-400">
            This token grants no administrative powers.
          </div>
          <p className="mt-1 text-ink-300">
            Supply is fixed, there is no owner, and no account can mint, pause, tax or seize
            balances. This is verified from the contract itself, not from a database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-2.5">
      {findings.map((finding) => {
        const config = SEVERITY[finding.severity];
        const Icon = config.icon;
        return (
          <li key={finding.code} className={cn('rounded-[10px] border p-3.5', config.card)}>
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge severity={finding.severity} />
              <strong className="text-[14px] text-ink-100">{finding.title}</strong>
            </div>
            <p className="mt-2 flex gap-2.5 text-[13px] leading-relaxed text-ink-300">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden />
              <span className="min-w-0">{finding.detail}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Gate that blocks an action until critical findings are acknowledged.
 *
 * The acknowledgement resets whenever the findings change, so a user cannot tick a box for one
 * token and have it silently carry over to another. Warnings inform; only critical findings
 * block, which keeps the gate meaningful instead of something users learn to click through.
 */
export function RiskGate({
  findings,
  children,
}: {
  findings: readonly RiskFinding[];
  children: (acknowledged: boolean) => React.ReactNode;
}): JSX.Element {
  const blocking = findings.filter((f) => f.severity === 'critical');
  const key = blocking.map((f) => f.code).join(',');
  const [acknowledgedKey, setAcknowledgedKey] = useState<string | null>(null);
  const acknowledged = blocking.length === 0 || acknowledgedKey === key;

  return (
    <>
      {blocking.length > 0 && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[10px] border border-alert-500/50 bg-alert-500/10 p-3.5 text-[13px] leading-relaxed">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledgedKey(e.target.checked ? key : null)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-alert-500)]"
          />
          <span className="min-w-0 text-ink-200">
            I understand this token grants{' '}
            <strong className="text-alert-400">
              {blocking.map((f) => f.title.toLowerCase()).join(', ')}
            </strong>
            , and that whoever holds those powers can act against my position at any time.
          </span>
        </label>
      )}
      {children(acknowledged)}
    </>
  );
}
