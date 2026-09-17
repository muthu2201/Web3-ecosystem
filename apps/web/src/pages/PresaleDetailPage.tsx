/**
 * A single sale: its live state, your position in it, and the one action available to you now.
 *
 * Which action that is falls out of the contract's own state machine rather than a guess. A sale
 * below its soft cap after closing offers a refund and nothing else; one that succeeded offers a
 * claim. Showing a button the contract would reject is how users pay gas to learn they could not
 * do the thing.
 */

import type { PresaleSnapshot, TxRequest } from '@web3eco/core';
import { formatUnits, parseUnits } from '@web3eco/core';
import { ArrowLeft, Gavel, HandCoins, RefreshCw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useSendTransaction } from 'wagmi';

import { TransactionReview } from '../components/TransactionReview.js';
import {
  Address,
  Badge,
  Button,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Progress,
  PulseDot,
  Skeleton,
  Stat,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { cn } from '../lib/cn.js';

interface Position {
  contribution: bigint;
  allocation: bigint;
  hasClaimed: boolean;
  hasRefunded: boolean;
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

export function PresaleDetailPage(): JSX.Element {
  const { address: saleAddress } = useParams<{ address: string }>();
  const { address: account, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [sale, setSale] = useState<PresaleSnapshot | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [chainNow, setChainNow] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [amount, setAmount] = useState('');
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;

  const refresh = useCallback(async (): Promise<void> => {
    if (!saleAddress) return;
    setRefreshing(true);
    try {
      const target = saleAddress as `0x${string}`;
      const [snapshot, isOurs, now] = await Promise.all([
        platform.presales.readPresale(platform.chain, target),
        platform.presales.isPlatformPresale(platform.chain, target),
        platform.reader.getBlockTimestamp(),
      ]);
      setSale(snapshot);
      setVerified(isOurs);
      setChainNow(now);
      setPosition(
        account ? await platform.presales.readPosition(platform.chain, target, account) : null,
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'could not read this sale');
    } finally {
      setRefreshing(false);
    }
  }, [saleAddress, account, platform.chain, platform.presales, platform.reader]);

  useEffect(() => {
    void refresh();
    // A sale's state changes with the clock as well as with contributions, so a page left open
    // must not keep offering an action the window has already closed on.
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function run(build: () => Promise<TxRequest>): Promise<void> {
    setError(null);
    setHash(null);
    try {
      setTx(await build());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not prepare that action');
    }
  }

  async function confirm(): Promise<void> {
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHash(sent);
      setTx(null);
      setAmount('');
      setTimeout(() => void refresh(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg">
        <Notice tone="alert" title="Could not load this sale">
          {loadError}
        </Notice>
        <Link to="/presale" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-flux-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to presales
        </Link>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel>
          <Skeleton className="h-56 w-full" />
        </Panel>
        <Panel>
          <Skeleton className="h-72 w-full" />
        </Panel>
      </div>
    );
  }

  const progress = sale.hardCap > 0n ? Number((sale.totalRaised * 10_000n) / sale.hardCap) : 0;
  const softReached = sale.totalRaised >= sale.softCap;
  const isOwner = account?.toLowerCase() === sale.owner.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/presale" className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Presales
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {verified === false && (
        <Notice tone="alert" title="This sale was not created by the platform factory">
          Its address is not in the factory's registry, so nothing about its terms has been
          enforced by the contracts described here. Treat anything it displays as unverified.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-[20px] font-semibold">
                  {sale.isFairLaunch ? 'Fair launch' : 'Presale'}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-400">
                  <span>Token</span>
                  <Address value={sale.token} chars={8} />
                </div>
              </div>
              <Badge tone={STATE_TONE[sale.state]}>
                {sale.state === 'live' && <PulseDot tone="flux" />}
                {STATE_LABEL[sale.state]}
              </Badge>
            </div>

            <Progress
              value={progress}
              tone={softReached ? 'good' : 'flux'}
              label={`${formatUnits(sale.totalRaised, 18, 4)} / ${formatUnits(sale.hardCap, 18, 4)} ${nativeSymbol} raised`}
            />

            <div className="mt-6 grid grid-cols-2 gap-5 border-t border-ink-900 pt-5 sm:grid-cols-4">
              <Stat
                label="Soft cap"
                value={formatUnits(sale.softCap, 18, 4)}
                sub={softReached ? 'reached' : 'not reached'}
                tone={softReached ? 'good' : 'default'}
              />
              <Stat label="Sale rate" value={formatUnits(sale.tokensPerNative, 18, 0)} sub={`per ${nativeSymbol}`} />
              <Stat
                label="Pool rate"
                value={formatUnits(sale.liquidityTokensPerNative, 18, 0)}
                sub={`per ${nativeSymbol}`}
              />
              <Stat label="To liquidity" value={`${Number(sale.liquidityBps) / 100}%`} sub="of the raise" />
            </div>

            <div className="mt-5 grid gap-3 border-t border-ink-900 pt-5 text-[13px] sm:grid-cols-2">
              <TimeRow label="Opens" at={sale.startsAt} now={chainNow} />
              <TimeRow label="Closes" at={sale.endsAt} now={chainNow} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="What the contract guarantees" />
            <ul className="grid gap-2.5 text-[13px] leading-relaxed text-ink-400">
              <li>
                <strong className="text-ink-200">Refunds are not discretionary.</strong> If the sale
                closes below its soft cap, every contributor withdraws their own contribution in
                full. There is no path in the contract that lets the creator keep it.
              </li>
              <li>
                <strong className="text-ink-200">
                  At least half the raise reaches the pool.
                </strong>{' '}
                The minimum is compiled in, and the platform fee is taken from the creator's share
                rather than from the liquidity allocation.
              </li>
              <li>
                <strong className="text-ink-200">The sale was funded before it opened.</strong> Its
                token allocation was pulled into the contract at creation, so a successful sale
                cannot fail to deliver.
              </li>
            </ul>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20">
          <Panel tone="lit">
            <PanelHeader title="Your position" />

            {!isConnected ? (
              <Notice tone="info">Connect a wallet to contribute or to see your position.</Notice>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <Stat
                    label="Contributed"
                    value={formatUnits(position?.contribution ?? 0n, 18, 6)}
                    sub={nativeSymbol}
                  />
                  <Stat
                    label="Allocation"
                    value={formatUnits(position?.allocation ?? 0n, 18, 4)}
                    sub="tokens"
                    tone="flux"
                  />
                </div>

                <div className="mt-5 border-t border-ink-900 pt-5">
                  {sale.state === 'live' && (
                    <>
                      <Field
                        label="Amount to contribute"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="0.0"
                        suffix={nativeSymbol}
                        hint={`Between ${formatUnits(sale.minContribution, 18, 6)} and ${formatUnits(sale.maxContribution, 18, 6)} ${nativeSymbol} per wallet.`}
                      />
                      {sale.whitelisted && (
                        <Notice tone="warn" className="mt-3" title="Whitelist only">
                          This sale requires a Merkle proof of allowlist membership. Obtain yours
                          from the sale's organiser — without it the contribution will revert.
                        </Notice>
                      )}
                      <Button
                        variant="primary"
                        size="lg"
                        block
                        className="mt-4"
                        disabled={amount.trim() === '' || sale.whitelisted}
                        onClick={() =>
                          void run(() =>
                            platform.presales.buildContribute(
                              platform.chain,
                              sale.presale,
                              parseUnits(amount, 18),
                              [],
                            ),
                          )
                        }
                      >
                        <HandCoins className="h-4 w-4" /> Review contribution
                      </Button>
                    </>
                  )}

                  {sale.state === 'pending' && (
                    <Notice tone="info" title="Not open yet">
                      Contributions are rejected until the window opens.
                    </Notice>
                  )}

                  {sale.state === 'awaitingFinalisation' && (
                    <>
                      <Notice tone="info" title="Closed above the soft cap">
                        Anyone can finalise: that seeds the pool, locks or burns the LP tokens and
                        opens claims. It is deliberately not restricted to the creator.
                      </Notice>
                      <Button
                        variant="primary"
                        size="lg"
                        block
                        className="mt-4"
                        onClick={() =>
                          void run(() =>
                            platform.presales.buildFinalise(platform.chain, sale.presale),
                          )
                        }
                      >
                        <Gavel className="h-4 w-4" /> Review finalisation
                      </Button>
                    </>
                  )}

                  {sale.state === 'succeeded' && (
                    <>
                      {position?.hasClaimed ? (
                        <Notice tone="good" title="Already claimed">
                          Your allocation has been sent to this wallet.
                        </Notice>
                      ) : (position?.allocation ?? 0n) > 0n ? (
                        <Button
                          variant="primary"
                          size="lg"
                          block
                          onClick={() =>
                            void run(() =>
                              platform.presales.buildClaim(platform.chain, sale.presale),
                            )
                          }
                        >
                          <HandCoins className="h-4 w-4" /> Claim your tokens
                        </Button>
                      ) : (
                        <Notice tone="info">This wallet did not contribute to the sale.</Notice>
                      )}
                    </>
                  )}

                  {sale.state === 'failed' && (
                    <>
                      {position?.hasRefunded ? (
                        <Notice tone="good" title="Already refunded">
                          Your contribution has been returned in full.
                        </Notice>
                      ) : (position?.contribution ?? 0n) > 0n ? (
                        <Button
                          variant="primary"
                          size="lg"
                          block
                          onClick={() =>
                            void run(() =>
                              platform.presales.buildRefund(platform.chain, sale.presale),
                            )
                          }
                        >
                          <Undo2 className="h-4 w-4" /> Refund in full
                        </Button>
                      ) : (
                        <Notice tone="info">
                          This sale did not reach its soft cap. Contributors can withdraw in full.
                        </Notice>
                      )}
                    </>
                  )}

                  {isOwner && sale.state === 'pending' && (
                    <Button
                      variant="outline"
                      size="md"
                      block
                      className="mt-3"
                      onClick={() =>
                        void run(() => platform.presales.buildCancel(platform.chain, sale.presale))
                      }
                    >
                      Cancel and open refunds
                    </Button>
                  )}
                </div>

                {error && (
                  <Notice tone="alert" className="mt-4">
                    {error}
                  </Notice>
                )}

                {hash && (
                  <Notice tone="good" title="Submitted" className="mt-4">
                    <span className="break-all font-mono text-[12px]">{hash}</span>
                  </Notice>
                )}

                {tx && (
                  <div className="mt-4">
                    <TransactionReview
                      tx={tx}
                      nativeSymbol={nativeSymbol}
                      simulate={(t) => platform.simulator.simulate(t, account as `0x${string}`)}
                      onConfirm={confirm}
                      onCancel={() => setTx(null)}
                      submitting={isPending}
                    />
                  </div>
                )}
              </>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function TimeRow({ label, at, now }: { label: string; at: number; now: number }): JSX.Element {
  const delta = at - now;
  const relative =
    now === 0
      ? ''
      : delta > 0
        ? `in ${formatDuration(delta)}`
        : `${formatDuration(-delta)} ago`;

  return (
    <div className="flex items-baseline justify-between gap-3 rounded-[10px] border border-ink-850 bg-ink-900/40 px-3.5 py-2.5">
      <span className="text-[12.5px] text-ink-500">{label}</span>
      <span className="text-right">
        <span className="block font-mono text-[12.5px] tabular text-ink-200">
          {new Date(at * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </span>
        {relative && <span className="block text-[11.5px] text-ink-500">{relative}</span>}
      </span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  if (d > 0) return `${d}d ${Math.floor((seconds % 86_400) / 3600)}h`;
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.max(0, Math.floor(seconds / 60))}m`;
}
