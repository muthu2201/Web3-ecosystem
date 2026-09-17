/**
 * Presales and fair launches: the directory, and the form that creates one.
 *
 * The creation form mirrors every bound the contract enforces — a minimum liquidity share, a
 * pool rate that cannot exceed the sale rate, a bounded window — and refuses to build a
 * transaction that would revert. Those are not house rules the operator can relax: they are in
 * the contract, and the form says so where it applies them.
 */

import type { PresaleSnapshot } from '@web3eco/core';
import { formatUnits, parseUnits } from '@web3eco/core';
import { PRESALE_LIMITS, tokensNeededFor, type PresaleCreateOptions } from '@web3eco/sdk';
import { Coins, Flame, Plus, Rocket, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useSendTransaction } from 'wagmi';

import { TransactionReview } from '../components/TransactionReview.js';
import {
  Address,
  Badge,
  Button,
  buttonClass,
  EmptyState,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Progress,
  Skeleton,
  Stat,
  Toggle,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { randomSalt } from '../lib/templates.js';
import { cn } from '../lib/cn.js';

const PAGE_SIZE = 24;
const ZERO_ROOT = `0x${'0'.repeat(64)}` as `0x${string}`;

export function PresalePage(): JSX.Element {
  const [tab, setTab] = useState<'browse' | 'create'>('browse');

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
            Presales &amp; fair launches
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            A sale is funded with its tokens before it can open, and at least half of everything it
            raises goes into the pool. Below the soft cap, every contributor takes their money back
            in full — the contract has no path that lets the creator keep it.
          </p>
        </div>

        <div className="flex gap-1 rounded-[var(--radius-pill)] border border-ink-850 bg-ink-900/50 p-1">
          {(['browse', 'create'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'min-h-10 rounded-[var(--radius-pill)] px-5 text-[13px] font-medium capitalize transition-colors',
                tab === t ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-200',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'browse' ? <PresaleDirectory /> : <CreatePresale />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

function PresaleDirectory(): JSX.Element {
  const platform = usePlatform();
  const [sales, setSales] = useState<PresaleSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const total = await platform.presales.totalPresales(platform.chain);
      if (total === 0) {
        setSales([]);
        return;
      }
      // Newest first: the last page holds the most recent sales.
      const offset = Math.max(0, total - PAGE_SIZE);
      const addresses = await platform.presales.listPresales(platform.chain, offset, PAGE_SIZE);
      const snapshots = await platform.presales.readPresales(platform.chain, addresses);
      setSales([...snapshots].reverse());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not read the presale registry');
    }
  }, [platform.chain, platform.presales]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Notice tone="alert" title="Could not load presales">
        {error}
      </Notice>
    );
  }

  if (!sales) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Panel key={i}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-16 w-full" />
          </Panel>
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Rocket} title="No sales on this chain yet">
          Nothing has been created through the presale factory here. Switch to the create tab to be
          the first.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sales.map((sale) => (
        <SaleCard key={sale.presale} sale={sale} nativeSymbol={platform.config.nativeCurrency.symbol} />
      ))}
    </div>
  );
}

const STATE_TONE = {
  pending: 'neutral',
  live: 'flux',
  awaitingFinalisation: 'sand',
  succeeded: 'good',
  failed: 'alert',
} as const;

const STATE_LABEL = {
  pending: 'Not open yet',
  live: 'Live',
  awaitingFinalisation: 'Awaiting finalisation',
  succeeded: 'Succeeded',
  failed: 'Refunding',
} as const;

function SaleCard({
  sale,
  nativeSymbol,
}: {
  sale: PresaleSnapshot;
  nativeSymbol: string;
}): JSX.Element {
  const progress = sale.hardCap > 0n ? Number((sale.totalRaised * 10_000n) / sale.hardCap) : 0;
  const softReached = sale.totalRaised >= sale.softCap;

  return (
    <Link
      to={`/presale/${sale.presale}`}
      className="group block rounded-[var(--radius-panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-flux-500"
    >
      <Panel className="h-full transition-colors group-hover:border-[color-mix(in_oklch,var(--color-flux-500)_35%,transparent)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATE_TONE[sale.state]}>{STATE_LABEL[sale.state]}</Badge>
              {sale.isFairLaunch && <Badge tone="sand">Fair launch</Badge>}
              {sale.whitelisted && <Badge tone="neutral">Whitelist</Badge>}
            </div>
            <div className="mt-2.5 text-[12.5px] text-ink-500">Token</div>
            <Address value={sale.token} chars={8} />
          </div>
        </div>

        <div className="mt-4">
          <Progress
            value={progress}
            tone={softReached ? 'good' : 'flux'}
            label={`${formatUnits(sale.totalRaised, 18, 4)} / ${formatUnits(sale.hardCap, 18, 4)} ${nativeSymbol}`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-900 pt-4">
          <Stat
            label="Soft cap"
            value={formatUnits(sale.softCap, 18, 4)}
            sub={softReached ? 'reached' : 'not yet reached'}
            tone={softReached ? 'good' : 'default'}
          />
          <Stat label="To liquidity" value={`${Number(sale.liquidityBps) / 100}%`} sub="of the raise" />
        </div>
      </Panel>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

interface FormState {
  token: string;
  tokensPerNative: string;
  liquidityTokensPerNative: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  startInMinutes: string;
  durationHours: string;
  liquidityBps: string;
  lockLp: boolean;
  lockDays: string;
  isFairLaunch: boolean;
}

const INITIAL: FormState = {
  token: '',
  tokensPerNative: '1000000',
  liquidityTokensPerNative: '800000',
  softCap: '5',
  hardCap: '20',
  minContribution: '0.01',
  maxContribution: '1',
  startInMinutes: '30',
  durationHours: '72',
  liquidityBps: '7000',
  lockLp: true,
  lockDays: '180',
  isFairLaunch: false,
};

function CreatePresale(): JSX.Element {
  const platform = usePlatform();
  const { address: account, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [salt] = useState(() => randomSalt());
  const [calls, setCalls] = useState<readonly import('@web3eco/core').TxRequest[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hashes, setHashes] = useState<string[]>([]);
  const [predicted, setPredicted] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((f) => ({ ...f, [key]: value }));

  const options = useMemo((): PresaleCreateOptions | null => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(form.token.trim())) return null;
    try {
      // `startsAt` is relative because an absolute datetime picker would be compared against the
      // chain's clock, not the browser's, and the two do drift. The exact base is read from the
      // chain when the transaction is built.
      const startOffset = Math.round(Number(form.startInMinutes) * 60);
      const duration = Math.round(Number(form.durationHours) * 3600);
      if (!Number.isFinite(startOffset) || !Number.isFinite(duration)) return null;

      return {
        chain: platform.chain,
        token: form.token.trim() as `0x${string}`,
        tokensPerNative: parseUnits(form.tokensPerNative, 18),
        liquidityTokensPerNative: parseUnits(form.liquidityTokensPerNative, 18),
        softCap: parseUnits(form.softCap, 18),
        hardCap: parseUnits(form.hardCap, 18),
        minContribution: parseUnits(form.minContribution, 18),
        maxContribution: parseUnits(form.maxContribution, 18),
        // Filled in against chain time in `prepare`; this placeholder never reaches a transaction.
        startsAt: 0,
        endsAt: duration,
        liquidityBps: Math.round(Number(form.liquidityBps)),
        lockLpInsteadOfBurn: form.lockLp,
        lpLockDurationSeconds: Math.round(Number(form.lockDays) * 86_400),
        whitelistRoot: ZERO_ROOT,
        isFairLaunch: form.isFairLaunch,
        salt,
      };
    } catch {
      return null;
    }
  }, [form, platform.chain, salt]);

  const needed = options ? tokensNeededFor(options) : null;

  async function prepare(): Promise<void> {
    if (!options) return;
    setError(null);
    setHashes([]);
    try {
      const now = await platform.reader.getBlockTimestamp();
      const startsAt = now + Math.round(Number(form.startInMinutes) * 60);
      const resolved: PresaleCreateOptions = {
        ...options,
        startsAt,
        endsAt: startsAt + Math.round(Number(form.durationHours) * 3600),
      };

      const batch = await platform.presales.buildCreatePresale(resolved);
      setCalls(batch.calls);
      setStep(0);

      if (account) {
        setPredicted(
          await platform.presales.predictPresaleAddress(platform.chain, account, salt),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the sale');
    }
  }

  async function confirm(): Promise<void> {
    const tx = calls[step];
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHashes((h) => [...h, sent]);
      if (step + 1 < calls.length) setStep(step + 1);
      else setCalls([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  const current = calls[step] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel>
          <PanelHeader
            title="The token being sold"
            description="Deploy it first if you have not — the sale pulls its entire allocation from your wallet when it is created."
          />
          <Field
            label="Token address"
            value={form.token}
            onChange={(e) => set('token', e.target.value)}
            placeholder="0x…"
            mono
            spellCheck={false}
          />

          <div className="mt-4">
            <Toggle
              checked={form.isFairLaunch}
              onChange={(v) => set('isFairLaunch', v)}
              label="Run this as a fair launch"
              hint="A fair launch has no individual allocation advantage; it is recorded on the sale so buyers can see which model they are entering."
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Pricing"
            description="The pool rate must not exceed the sale rate. If it did, the first seller would instantly dump below the price buyers paid — the contract rejects it."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Sale rate"
              value={form.tokensPerNative}
              onChange={(e) => set('tokensPerNative', e.target.value)}
              inputMode="decimal"
              suffix={`per ${nativeSymbol}`}
              hint="Tokens a contributor receives per unit contributed."
            />
            <Field
              label="Pool rate"
              value={form.liquidityTokensPerNative}
              onChange={(e) => set('liquidityTokensPerNative', e.target.value)}
              inputMode="decimal"
              suffix={`per ${nativeSymbol}`}
              error={
                Number(form.liquidityTokensPerNative) > Number(form.tokensPerNative)
                  ? 'the pool rate must not exceed the sale rate'
                  : null
              }
              hint="Tokens placed in the pool per unit of the raise routed there."
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Caps and limits" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Soft cap"
              value={form.softCap}
              onChange={(e) => set('softCap', e.target.value)}
              inputMode="decimal"
              suffix={nativeSymbol}
              hint="Below this, every contributor is refunded in full."
            />
            <Field
              label="Hard cap"
              value={form.hardCap}
              onChange={(e) => set('hardCap', e.target.value)}
              inputMode="decimal"
              suffix={nativeSymbol}
            />
            <Field
              label="Minimum contribution"
              value={form.minContribution}
              onChange={(e) => set('minContribution', e.target.value)}
              inputMode="decimal"
              suffix={nativeSymbol}
            />
            <Field
              label="Maximum per wallet"
              value={form.maxContribution}
              onChange={(e) => set('maxContribution', e.target.value)}
              inputMode="decimal"
              suffix={nativeSymbol}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Window" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Opens in"
              value={form.startInMinutes}
              onChange={(e) => set('startInMinutes', e.target.value)}
              inputMode="numeric"
              suffix="minutes"
              hint="Measured from the chain's clock at the moment you sign, not your device's."
            />
            <Field
              label="Runs for"
              value={form.durationHours}
              onChange={(e) => set('durationHours', e.target.value)}
              inputMode="numeric"
              suffix="hours"
              hint={`Between 1 hour and ${PRESALE_LIMITS.MAX_DURATION_SECONDS / 86_400} days.`}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Liquidity"
            description="Enforced by the contract, not by this form: at least half of everything raised must reach the pool."
          />
          <Field
            label="Share of the raise routed to liquidity"
            value={form.liquidityBps}
            onChange={(e) => set('liquidityBps', e.target.value)}
            inputMode="numeric"
            suffix="bps"
            error={
              Number(form.liquidityBps) < PRESALE_LIMITS.MIN_LIQUIDITY_BPS
                ? `the contract requires at least ${PRESALE_LIMITS.MIN_LIQUIDITY_BPS} bps (50%)`
                : Number(form.liquidityBps) > 10_000
                  ? 'cannot exceed 10000 bps (100%)'
                  : null
            }
            hint={`${(Number(form.liquidityBps) / 100).toFixed(2)}% of the raise. The platform fee comes out of your share, never out of the pool.`}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Toggle
              checked={form.lockLp}
              onChange={(v) => set('lockLp', v)}
              label={form.lockLp ? 'Lock the LP tokens' : 'Burn the LP tokens'}
              hint={
                form.lockLp
                  ? 'Locked in a contract with no owner, no pause and no emergency path — not even the platform can pull them out early.'
                  : 'Sent to the burn address. Irreversible, and the strongest possible signal that the pool will not be withdrawn.'
              }
            />
            {form.lockLp && (
              <Field
                label="Lock duration"
                value={form.lockDays}
                onChange={(e) => set('lockDays', e.target.value)}
                inputMode="numeric"
                suffix="days"
                error={
                  Number(form.lockDays) < PRESALE_LIMITS.MIN_LP_LOCK_SECONDS / 86_400
                    ? 'the contract requires at least 30 days'
                    : null
                }
              />
            )}
          </div>
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-20">
        <Panel tone="lit">
          <PanelHeader title="Before you sign" />

          {needed !== null && (
            <div className="rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
              <div className="text-[11.5px] uppercase tracking-[0.07em] text-ink-500">
                Tokens this sale needs
              </div>
              <div className="mt-1 break-all font-mono text-[15px] tabular text-flux-300">
                {formatUnits(needed, 18, 4)}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                Pulled from your wallet the moment the sale is created, covering both buyer
                allocations at the hard cap and the pool's share. Computed with the same two
                truncations the contract uses, so this is the exact figure it will take.
              </p>
            </div>
          )}

          {predicted && (
            <div className="mt-4 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
              <div className="text-[11.5px] uppercase tracking-[0.07em] text-ink-500">
                Sale address
              </div>
              <div className="mt-1 break-all font-mono text-[12.5px] text-ink-200">{predicted}</div>
            </div>
          )}

          <Notice tone="info" className="mt-4" title="Two transactions">
            An exact-amount approval, then the creation itself. The approval grants only what the
            sale needs — never an unlimited allowance.
          </Notice>

          {error && (
            <Notice tone="alert" className="mt-4">
              {error}
            </Notice>
          )}

          {hashes.map((h) => (
            <Notice key={h} tone="good" className="mt-4" title="Submitted">
              <span className="break-all font-mono text-[12px]">{h}</span>
            </Notice>
          ))}

          {current ? (
            <div className="mt-4">
              <div className="mb-3 text-[12.5px] text-ink-500">
                Step {step + 1} of {calls.length}
              </div>
              <TransactionReview
                tx={current}
                nativeSymbol={nativeSymbol}
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
              disabled={!options || !isConnected}
              onClick={prepare}
            >
              <Plus className="h-4 w-4" />
              {isConnected ? 'Review sale' : 'Connect a wallet'}
            </Button>
          )}

          <ul className="mt-5 grid gap-2 border-t border-ink-900 pt-4 text-[12px] leading-relaxed text-ink-500">
            <li className="flex gap-2">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-600" />
              Below the soft cap, contributors refund themselves. You cannot keep the money.
            </li>
            <li className="flex gap-2">
              <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-600" />
              The platform fee is taken from your share of the raise, never from the pool.
            </li>
            <li className="flex gap-2">
              <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-600" />
              LP tokens are locked or burned at finalisation. There is no third option.
            </li>
          </ul>
        </Panel>

        <Link to="/deploy" className={cn(buttonClass({ variant: 'ghost', size: 'sm' }), 'mt-3 w-full')}>
          Need a token first? Deploy one
        </Link>
      </aside>
    </div>
  );
}
