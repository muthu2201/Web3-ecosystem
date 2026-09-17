/**
 * Risk disclosure.
 *
 * The blueprint is unambiguous that warnings must be unskippable and in plain language, because
 * the pattern being defended against is a user buying a token whose contract lets someone else
 * take it back. These components deliberately do not use subtle styling for critical findings:
 * a power that lets an account seize a balance is not a footnote.
 */

import type { RiskFinding, RiskSeverity } from '@web3eco/core';
import { useState } from 'react';

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Note',
  none: 'No findings',
};

const SEVERITY_STYLE: Record<RiskSeverity, React.CSSProperties> = {
  critical: { background: '#3a0d0d', borderColor: '#b9382f', color: '#ffb4ad' },
  warning: { background: '#3a2c0d', borderColor: '#b98d2f', color: '#ffddad' },
  info: { background: '#12243a', borderColor: '#2f6ab9', color: '#addcff' },
  none: { background: '#0d2a18', borderColor: '#2f9457', color: '#a9f0c6' },
};

export function RiskBadge({ severity }: { severity: RiskSeverity }): JSX.Element {
  return (
    <span
      style={{
        ...SEVERITY_STYLE[severity],
        border: '1px solid',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function RiskFindings({ findings }: { findings: readonly RiskFinding[] }): JSX.Element {
  if (findings.length === 0) {
    return (
      <div style={{ ...SEVERITY_STYLE.none, border: '1px solid', borderRadius: 6, padding: 12 }}>
        <strong>This token grants no administrative powers.</strong>
        <p style={{ margin: '6px 0 0', fontSize: 13 }}>
          Supply is fixed, there is no owner, and no account can mint, pause, tax or seize
          balances. This is verified from the contract itself, not from a database.
        </p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {findings.map((finding) => (
        <li
          key={finding.code}
          style={{
            ...SEVERITY_STYLE[finding.severity],
            border: '1px solid',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RiskBadge severity={finding.severity} />
            <strong>{finding.title}</strong>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>{finding.detail}</p>
        </li>
      ))}
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
        <label
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            margin: '12px 0',
            padding: 12,
            border: '1px solid #b9382f',
            borderRadius: 6,
            background: '#2a0a0a',
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledgedKey(e.target.checked ? key : null)}
          />
          <span>
            I understand this token grants{' '}
            <strong>{blocking.map((f) => f.title.toLowerCase()).join(', ')}</strong>, and that
            whoever holds those powers can act against my position at any time.
          </span>
        </label>
      )}
      {children(acknowledged)}
    </>
  );
}
