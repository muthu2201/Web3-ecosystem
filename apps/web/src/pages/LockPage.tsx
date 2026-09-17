/**
 * Liquidity locker.
 *
 * The locker contract has no owner, no pause and no emergency withdrawal. That absence is the
 * entire product: a lock is only a promise if nobody — including whoever runs this site — can
 * break it early. Everything on this page is therefore either a read or an action taken by the
 * lock's own owner.
 */

import { formatUnits, parseUnits } from '@web3eco/core';
import type { TxRequest } from '@web3eco/core';
import type { LockRecord } from '@web3eco/sdk';
import { CalendarClock, KeyRound, Lock, Plus, Search, Unlock } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { TransactionReview } from '../components/TransactionReview.js';
import {
  Address,
  Badge,
  Button,
  EmptyState,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { cn } from '../lib/cn.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function LockPage(): JSX.Element {
  const platform = usePlatform();
  const { address: account, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [locks, setLocks] = useState<LockRecord[] | null>(null);
  const [chainNow, setChainNow] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('180');

  const [lookupToken, setLookupToken] = useState('');
  const [summary, setSummary] = useState<{ amount: bigint; latestUnlock: number } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [calls, setCalls] = useState<readonly TxRequest[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hashes, setHashes] = useState<string[]>([]);

  const load = useCallback(async (): Promise<void> => {
    if (!account) {
      setLocks([]);
      return;
    }
    try {
      const [ids, now] = await Promise.all([
        platform.locker.lockIdsOfOwner(platform.chain, account),
        platform.reader.getBlockTimestamp(),
      ]);
      setChainNow(now);
      setLocks(await platform.locker.readLocks(platform.chain, ids));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'could not read your locks');
    }
  }, [account, platform.chain, platform.locker, platform.reader]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lookup(): Promise<void> {
    setSummaryError(null);
    setSummary(null);
    if (!ADDRESS_RE.test(lookupToken.trim())) {
      setSummaryError('that is not a valid address');
      return;
    }
    try {
      setSummary(
        await platform.locker.lockSummary(platform.chain, lookupToken.trim() as `0x${string}`),
      );
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'could not read that token');
    }
  }

  async function prepareLock(): Promise<void> {
    if (!account) return;
    setError(null);
    setHashes([]);
    try {
      const now = await platform.reader.getBlockTimestamp();
      const batch = await platform.locker.buildLock(
        platform.chain,
        token.trim() as `0x${string}`,
        parseUnits(amount, 18),
        now + Math.round(Number(days) * 86_400),
        account,
      );
      setCalls(batch.calls);
      setStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the lock');
    }
  }

  async function run(build: () => Promise<TxRequest>): Promise<void> {
    setError(null);
    try {
      setCalls([await build()]);
      setStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not prepare that action');
    }
  }

  async function confirm(): Promise<void> {
    const tx = calls[step];
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHashes((h) => [...h, sent]);
      if (step + 1 < calls.length) {
        setStep(step + 1);
      } else {
        setCalls([]);
        setStep(0);
        setAmount('');
        setTimeout(() => void load(), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  const current = calls[step] ?? null;
  const ready = ADDRESS_RE.test(token.trim()) && amount.trim() !== '' && Number(days) > 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
          Liquidity locker
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          No owner. No pause. No emergency withdrawal. Once tokens are locked, nothing and nobody
          can take them out before the unlock time — that is what makes the lock worth anything.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <Panel tone="lit">
            <PanelHeader title="Lock tokens" />
            <div className="grid gap-4">
              <Field
                label="Token address"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="0x…"
                mono
                spellCheck={false}
                hint="Usually an LP token, but any ERC-20 can be locked."
              />
              <Field
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.0"
              />
              <Field
                label="Lock for"
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                suffix="days"
                mono
                hint="Counted from the chain's clock at the moment you sign. Extending later is allowed; shortening is not."
              />
            </div>

            <Notice tone="info" className="mt-4" title="Two transactions">
              An approval for exactly this amount, then the lock. The approval is never unlimited.
            </Notice>

            {error && (
              <Notice tone="alert" className="mt-4">
                {error}
              </Notice>
            )}

            {hashes.map((h) => (
              <Notice key={h} tone="good" title="Submitted" className="mt-4">
                <span className="break-all font-mono text-[12px]">{h}</span>
              </Notice>
            ))}

            {current ? (
              <div className="mt-4">
                {calls.length > 1 && (
                  <div className="mb-3 text-[12.5px] text-ink-500">
                    Step {step + 1} of {calls.length}
                  </div>
                )}
                <TransactionReview
                  tx={current}
                  nativeSymbol={platform.config.nativeCurrency.symbol}
                  simulate={(t) => platform.simulator.simulate(t, account as `0x${string}`)}
                  onConfirm={confirm}
                  onCancel={() => setCalls([])}
                  submitting={isPending}
                />
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                block
                className="mt-4"
                disabled={!ready || !isConnected}
                onClick={prepareLock}
              >
                <Lock className="h-4 w-4" />
                {isConnected ? 'Review lock' : 'Connect a wallet'}
              </Button>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Check a token"
              description="Anyone can verify how much of a token is locked and until when — no wallet required."
            />
            <Field
              value={lookupToken}
              onChange={(e) => setLookupToken(e.target.value)}
              placeholder="0x…"
              mono
              spellCheck={false}
              error={summaryError}
            />
            <Button variant="glass" size="md" block className="mt-3" onClick={lookup}>
              <Search className="h-4 w-4" /> Look up
            </Button>

            {summary && (
              <div className="mt-4 grid grid-cols-2 gap-5 border-t border-ink-900 pt-4">
                <Stat
                  label="Total locked"
                  value={formatUnits(summary.amount, 18, 4)}
                  tone={summary.amount > 0n ? 'good' : 'default'}
                />
                <Stat
                  label="Latest unlock"
                  value={
                    summary.latestUnlock === 0
                      ? '—'
                      : new Date(summary.latestUnlock * 1000).toISOString().slice(0, 10)
                  }
                />
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader
              title="Your locks"
              description="Everything this wallet owns in the locker, read straight from the contract."
            />

            {loadError ? (
              <Notice tone="alert">{loadError}</Notice>
            ) : !isConnected ? (
              <EmptyState icon={KeyRound} title="Connect a wallet">
                Your locks are keyed to the address that owns them.
              </EmptyState>
            ) : !locks ? (
              <div className="grid gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : locks.length === 0 ? (
              <EmptyState icon={Lock} title="No locks yet">
                Anything you lock — or any LP a presale locks on your behalf — will appear here.
              </EmptyState>
            ) : (
              <ul className="grid gap-3">
                {locks.map((lock) => (
                  <LockCard
                    key={lock.lockId.toString()}
                    lock={lock}
                    now={chainNow}
                    onWithdraw={() =>
                      void run(() =>
                        platform.locker.buildWithdraw(
                          platform.chain,
                          lock.lockId,
                          lock.amount,
                          account as `0x${string}`,
                        ),
                      )
                    }
                    onExtend={(newUnlock) =>
                      void run(() =>
                        platform.locker.buildExtend(platform.chain, lock.lockId, newUnlock),
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="What this contract cannot do" />
            <ul className="grid gap-2.5 text-[13px] leading-relaxed text-ink-400">
              <li>
                <strong className="text-ink-200">It cannot be paused.</strong> There is no pause
                modifier anywhere in it, so nobody can freeze withdrawals after an unlock passes.
              </li>
              <li>
                <strong className="text-ink-200">It has no owner.</strong> No admin role exists, so
                there is no key to lose, steal or misuse.
              </li>
              <li>
                <strong className="text-ink-200">It cannot shorten a lock.</strong> Extending is
                allowed because it only ever strengthens the promise; the reverse reverts.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function LockCard({
  lock,
  now,
  onWithdraw,
  onExtend,
}: {
  lock: LockRecord;
  now: number;
  onWithdraw: () => void;
  onExtend: (newUnlockTime: number) => void;
}): JSX.Element {
  const [extendDays, setExtendDays] = useState('');
  const unlocked = now >= lock.unlockTime;
  const remaining = Math.max(0, lock.unlockTime - now);

  return (
    <li className={cn('rounded-[10px] border p-4', unlocked ? 'border-good-500/35' : 'border-ink-850')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] text-ink-300">#{lock.lockId.toString()}</span>
            {unlocked ? (
              <Badge tone="good">
                <Unlock className="h-3 w-3" /> Unlocked
              </Badge>
            ) : (
              <Badge tone="flux">
                <Lock className="h-3 w-3" /> {Math.ceil(remaining / 86_400)}d remaining
              </Badge>
            )}
          </div>
          <div className="mt-2">
            <Address value={lock.token} chars={8} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[15px] tabular text-ink-100">
            {formatUnits(lock.amount, 18, 6)}
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11.5px] text-ink-500">
            <CalendarClock className="h-3 w-3" />
            {new Date(lock.unlockTime * 1000).toISOString().slice(0, 10)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Button variant="primary" size="sm" disabled={!unlocked || lock.amount === 0n} onClick={onWithdraw}>
          Withdraw
        </Button>
        <div className="flex items-end gap-2">
          <input
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="days"
            aria-label={`Extend lock ${lock.lockId} by days`}
            className="h-8 w-20 min-w-0 rounded-[var(--radius-hair)] border border-ink-800 bg-ink-900/60 px-2 font-mono text-[12.5px] text-ink-100 placeholder:text-ink-600 focus:border-flux-500 focus:outline-none"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={extendDays === '' || Number(extendDays) <= 0}
            onClick={() => onExtend(lock.unlockTime + Number(extendDays) * 86_400)}
          >
            <Plus className="h-3.5 w-3.5" /> Extend
          </Button>
        </div>
      </div>
    </li>
  );
}
