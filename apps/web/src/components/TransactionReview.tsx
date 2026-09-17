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
import type { JSX } from 'react';
import { useEffect, useState } from 'react';

import { Button } from './ui/Button.js';
import { Notice, Spinner } from './ui/Feedback.js';

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
    <div className="rounded-[var(--radius-panel)] border border-ink-800 bg-ink-900/55 p-4 sm:p-5">
      <div>
        <div className="text-[15px] font-semibold text-ink-100">Review before signing</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
          Check this against what your wallet shows. If the two disagree, do not sign.
        </p>
      </div>

      <dl className="mt-4 grid gap-y-2 text-[13px]">
        <Row label="Action">{tx.summary}</Row>
        <Row label="Contract">
          <span className="break-all font-mono text-[12.5px]">{tx.to}</span>
        </Row>
        <Row label="Value">
          <span className="font-mono tabular">
            {formatUnits(tx.value, 18)} {nativeSymbol}
          </span>
        </Row>
        <Row label="Chain">
          <span className="font-mono text-[12.5px]">{tx.chain}</span>
        </Row>
      </dl>

      <div className="mt-4">
        <SimulationPanel state={state} nativeSymbol={nativeSymbol} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" size="md" onClick={onCancel} disabled={submitting} className="sm:flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          disabled={!canSign}
          className="sm:flex-[2]"
          title={
            simulationFailed
              ? 'This transaction would revert. Signing it would only cost you gas.'
              : state.status === 'unavailable'
                ? 'Simulation could not run, so this transaction cannot be verified.'
                : undefined
          }
        >
          {submitting ? 'Waiting for your wallet…' : 'Sign in wallet'}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-3">
      <dt className="text-[12px] uppercase tracking-[0.06em] text-ink-500">{label}</dt>
      <dd className="m-0 min-w-0 text-ink-200">{children}</dd>
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
    return (
      <Notice tone="info">
        <span className="flex items-center gap-2">
          <Spinner className="h-3.5 w-3.5" />
          Simulating this transaction against the current chain state…
        </span>
      </Notice>
    );
  }

  if (state.status === 'unavailable') {
    // Deliberately distinct from success. An unchecked transaction is not a verified one.
    return (
      <Notice tone="warn" title="This transaction could not be simulated">
        <span className="block">{state.reason}</span>
        <span className="mt-1.5 block">
          That does not mean it is unsafe — it means it has not been checked. Verify every detail
          in your wallet before signing.
        </span>
      </Notice>
    );
  }

  if (!state.result.success) {
    return (
      <Notice tone="alert" title="This transaction would fail">
        <span className="block">
          {state.result.revertReason ?? 'The simulation reverted without giving a reason.'}
        </span>
        <span className="mt-1.5 block">
          Signing it would cost gas and change nothing. Signing has been disabled.
        </span>
      </Notice>
    );
  }

  return (
    <Notice tone="good" title="Simulation succeeded">
      {state.result.gasUsed !== null && (
        <span className="block font-mono text-[12px] tabular">
          Estimated gas: {state.result.gasUsed.toString()}
        </span>
      )}
      {state.result.balanceChanges.length > 0 && (
        <ul className="mt-2 grid gap-1">
          {state.result.balanceChanges.map((change, i) => (
            <li key={i} className="font-mono text-[12px] tabular">
              <span className={change.delta < 0n ? 'text-alert-400' : 'text-good-400'}>
                {change.delta < 0n ? '−' : '+'}
                {formatUnits(change.delta < 0n ? -change.delta : change.delta, 18)} {nativeSymbol}
              </span>{' '}
              <span className="break-all text-ink-500">{change.account}</span>
            </li>
          ))}
        </ul>
      )}
      {state.result.warnings.map((warning) => (
        <span key={warning} className="mt-1.5 block">
          {warning}
        </span>
      ))}
    </Notice>
  );
}
