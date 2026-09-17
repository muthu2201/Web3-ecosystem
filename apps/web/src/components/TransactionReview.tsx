/**
 * Transaction review with simulation before signing.
 *
 * THIS IS THE MOST IMPORTANT COMPONENT IN THE APPLICATION. In February 2025 attackers injected
 * JavaScript into Safe{Wallet}'s served front-end and had a multisig sign a transaction that did
 * something other than what the screen showed. Roughly $1.46B moved. No contract was exploited.
 * Every contract in this repository could be flawless and that attack would still work.
 *
 * What breaks it is showing the user what the transaction ACTUALLY does, derived from simulating
 * the exact payload about to be signed rather than from the UI's own description of it. If a
 * compromised bundle swaps the payload, the simulation reflects the swap and the discrepancy is
 * visible before the signature instead of after the funds are gone.
 *
 * Two deliberate choices:
 *
 *   - A failed simulation blocks signing rather than warning. A transaction that reverts in
 *     simulation will revert on chain; letting it through only costs the user gas, and treating
 *     it as dismissible trains people to click past the one that matters.
 *   - If simulation cannot run at all, that is surfaced as a distinct state, not silently
 *     skipped. "We could not check this" and "we checked this and it is fine" must never look
 *     the same.
 */

import type { SimulationResult, TxRequest } from '@web3eco/core';
import { formatUnits } from '@web3eco/core';
import { useEffect, useState } from 'react';

type SimulationState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: SimulationResult }
  | { status: 'unavailable'; reason: string };

export interface TransactionReviewProps {
  readonly tx: TxRequest;
  readonly nativeSymbol: string;
  readonly simulate: (tx: TxRequest) => Promise<SimulationResult>;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly submitting?: boolean;
}

export function TransactionReview({
  tx,
  nativeSymbol,
  simulate,
  onConfirm,
  onCancel,
  submitting = false,
}: TransactionReviewProps): JSX.Element {
  const [state, setState] = useState<SimulationState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'running' });

    simulate(tx)
      .then((result) => {
        if (!cancelled) setState({ status: 'done', result });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'unavailable',
            reason: err instanceof Error ? err.message : 'the simulation could not be performed',
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // Re-simulates whenever the payload changes, so an edited amount is never signed against a
    // stale result.
  }, [tx, simulate]);

  const simulationFailed = state.status === 'done' && !state.result.success;
  const canSign = state.status === 'done' && state.result.success && !submitting;

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, display: 'grid', gap: 14 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Review before signing</div>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.75 }}>
          Check this against what your wallet shows. If the two disagree, do not sign.
        </p>
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', margin: 0, fontSize: 13 }}>
        <dt style={{ opacity: 0.7 }}>Action</dt>
        <dd style={{ margin: 0 }}>{tx.summary}</dd>

        <dt style={{ opacity: 0.7 }}>Contract</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
          {tx.to}
        </dd>

        <dt style={{ opacity: 0.7 }}>Value</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          {formatUnits(tx.value, 18)} {nativeSymbol}
        </dd>

        <dt style={{ opacity: 0.7 }}>Chain</dt>
        <dd style={{ margin: 0 }}>{tx.chain}</dd>
      </dl>

      <SimulationPanel state={state} nativeSymbol={nativeSymbol} />

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onCancel} disabled={submitting} style={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canSign}
          style={{ ...primaryButton, opacity: canSign ? 1 : 0.45 }}
          title={
            simulationFailed
              ? 'This transaction would revert. Signing it would only cost you gas.'
              : state.status === 'unavailable'
                ? 'Simulation could not run, so this transaction cannot be verified.'
                : undefined
          }
        >
          {submitting ? 'Waiting for your wallet…' : 'Sign in wallet'}
        </button>
      </div>
    </div>
  );
}

function SimulationPanel({
  state,
  nativeSymbol,
}: {
  state: SimulationState;
  nativeSymbol: string;
}): JSX.Element {
  if (state.status === 'idle' || state.status === 'running') {
    return <Panel tone="info">Simulating this transaction against the current chain state…</Panel>;
  }

  if (state.status === 'unavailable') {
    // Deliberately distinct from success. An unchecked transaction is not a verified one.
    return (
      <Panel tone="warning">
        <strong>This transaction could not be simulated.</strong>
        <div style={{ marginTop: 4 }}>{state.reason}</div>
        <div style={{ marginTop: 6 }}>
          That does not mean it is unsafe — it means it has not been checked. Verify every detail
          in your wallet before signing.
        </div>
      </Panel>
    );
  }

  if (!state.result.success) {
    return (
      <Panel tone="critical">
        <strong>This transaction would fail.</strong>
        <div style={{ marginTop: 4 }}>
          {state.result.revertReason ?? 'The simulation reverted without giving a reason.'}
        </div>
        <div style={{ marginTop: 6 }}>
          Signing it would cost gas and change nothing. Signing has been disabled.
        </div>
      </Panel>
    );
  }

  return (
    <Panel tone="ok">
      <strong>Simulation succeeded.</strong>
      {state.result.gasUsed !== null && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Estimated gas: {state.result.gasUsed.toString()}
        </div>
      )}
      {state.result.balanceChanges.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {state.result.balanceChanges.map((change, i) => (
            <li key={i} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {change.delta < 0n ? '−' : '+'}
              {formatUnits(change.delta < 0n ? -change.delta : change.delta, 18)} {nativeSymbol}{' '}
              <span style={{ opacity: 0.6 }}>{change.account}</span>
            </li>
          ))}
        </ul>
      )}
      {state.result.warnings.map((warning) => (
        <div key={warning} style={{ marginTop: 6 }}>
          {warning}
        </div>
      ))}
    </Panel>
  );
}

function Panel({
  tone,
  children,
}: {
  tone: 'ok' | 'info' | 'warning' | 'critical';
  children: React.ReactNode;
}): JSX.Element {
  const tones = {
    ok: { background: '#0d2a18', borderColor: '#2f9457', color: '#a9f0c6' },
    info: { background: '#12243a', borderColor: '#2f6ab9', color: '#addcff' },
    warning: { background: '#3a2c0d', borderColor: '#b98d2f', color: '#ffddad' },
    critical: { background: '#3a0d0d', borderColor: '#b9382f', color: '#ffb4ad' },
  } as const;

  return (
    <div
      style={{
        ...tones[tone],
        border: '1px solid',
        borderRadius: 6,
        padding: 12,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 6,
  border: '1px solid #3b82f6',
  background: '#1d4ed8',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 6,
  border: '1px solid #3a3a3a',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};
