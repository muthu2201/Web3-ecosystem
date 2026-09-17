/**
 * Bonding-curve trading.
 *
 * Quotes are computed locally from the reserves in `@web3eco/core` — the same maths that is
 * differential-tested byte-for-byte against the Solidity library. That means the price updates as
 * you type without an RPC round trip per keystroke, and the number shown is the number the chain
 * will produce. Nothing about the quote is an estimate.
 */

import type { CurveSnapshot } from '@web3eco/core';
import { applySlippage, formatUnits, parseUnits, type TxRequest } from '@web3eco/core';
import { ArrowLeft, ArrowUpDown, Radio, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useSendTransaction } from 'wagmi';

import { CurveChart } from '../components/CurveChart.js';
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

type Side = 'buy' | 'sell';

const V_NATIVE_START = 1_500_000_000_000_000_000n;
const V_TOKEN_START = 1_073_000_000n * 10n ** 18n;

export function CurvePage(): JSX.Element {
  const { address: curveAddress } = useParams<{ address: string }>();
  const { address: account, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [snapshot, setSnapshot] = useState<CurveSnapshot | null>(null);
  const [feeBps, setFeeBps] = useState<bigint>(0n);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [side, setSide] = useState<Side>('buy');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(100);
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const nativeSymbol = platform.config.nativeCurrency.symbol;

  const refresh = useCallback(async (): Promise<void> => {
    if (!curveAddress) return;
    setRefreshing(true);
    try {
      const [snap, bps] = await Promise.all([
        platform.curves.readCurve(platform.chain, curveAddress as `0x${string}`),
        platform.curves.readTradeFeeBps(platform.chain),
      ]);
      setSnapshot(snap);
      setFeeBps(bps);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'could not read this curve');
    } finally {
      setRefreshing(false);
    }
  }, [curveAddress, platform.chain, platform.curves]);

  useEffect(() => {
    void refresh();
    // Reserves move with every trade, so a stale price shown as current is how a user ends up
    // signing against a curve that has already moved past their slippage bound.
    const timer = setInterval(() => void refresh(), 12_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const quote = useMemo(() => {
    if (!snapshot || amount.trim() === '') return null;
    try {
      const parsed = parseUnits(amount, 18);
      if (parsed <= 0n) return null;
      return side === 'buy'
        ? platform.curves.quoteBuyLocal(snapshot, parsed, feeBps, BigInt(slippageBps))
        : platform.curves.quoteSellLocal(snapshot, parsed, feeBps, BigInt(slippageBps));
    } catch {
      // An amount mid-typing ("0.", "1.2.3") is not an error worth shouting about.
      return null;
    }
  }, [snapshot, amount, side, feeBps, slippageBps, platform.curves]);

  async function prepare(): Promise<void> {
    if (!snapshot || !curveAddress) return;
    setError(null);
    setHash(null);
    try {
      const parsed = parseUnits(amount, 18);
      // Deadline from chain time, not the device clock: an L2's timestamp can sit well away from
      // wall-clock time, and a deadline from the wrong clock either expires instantly or silently
      // disables the protection it exists to provide.
      const deadline = (await platform.reader.getBlockTimestamp()) + 600;

      if (side === 'buy') {
        const q = platform.curves.quoteBuyLocal(snapshot, parsed, feeBps, BigInt(slippageBps));
        setTx(
          await platform.curves.buildBuy(
            platform.chain,
            curveAddress as `0x${string}`,
            parsed,
            q.minTokensOut,
            deadline,
          ),
        );
      } else {
        const q = platform.curves.quoteSellLocal(snapshot, parsed, feeBps, BigInt(slippageBps));
        const batch = await platform.curves.buildSell(
          platform.chain,
          curveAddress as `0x${string}`,
          parsed,
          applySlippage(q.nativeOut, BigInt(slippageBps)),
          deadline,
        );
        // Selling needs an approval first. Presented one call at a time so the user reviews and
        // simulates each, rather than approving something they have not seen.
        setTx(batch.calls[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not prepare the trade');
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
        <Notice tone="alert" title="Could not load this curve">
          {loadError}
        </Notice>
        <Link to="/explore" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-flux-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to markets
        </Link>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel><Skeleton className="h-64 w-full" /></Panel>
        <Panel><Skeleton className="h-80 w-full" /></Panel>
      </div>
    );
  }

  const progressBps =
    snapshot.curveSupply > 0n ? Number((snapshot.tokensSold * 10_000n) / snapshot.curveSupply) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Markets
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-[20px] font-semibold">Bonding curve</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-400">
                  <span>Token</span>
                  <Address value={snapshot.token} chars={8} />
                </div>
              </div>
              {snapshot.graduated ? (
                <Badge tone="good">Graduated</Badge>
              ) : (
                <Badge tone="flux">
                  <PulseDot tone="flux" /> Live
                </Badge>
              )}
            </div>

            {snapshot.poolPreSeeded && (
              <Notice tone="warn" title="This token’s pool was seeded before graduation" className="mb-5">
                Someone has already placed liquidity in the pair. The price after graduation may be
                distorted by whatever ratio they chose. Nothing is broken, but the graduated market
                will not start where the curve left off.
              </Notice>
            )}

            <CurveChart
              virtualNativeStart={V_NATIVE_START}
              virtualTokenStart={V_TOKEN_START}
              curveSupply={snapshot.curveSupply}
              tokensSold={snapshot.tokensSold}
              height={200}
            />

            <div className="mt-5">
              <Progress value={progressBps} tone={snapshot.graduated ? 'good' : 'flux'} label="Progress to graduation" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-5 border-t border-ink-900 pt-5 sm:grid-cols-4">
              <Stat label="Raised" value={`${formatUnits(snapshot.realNativeReserve, 18, 4)}`} sub={nativeSymbol} tone="flux" />
              <Stat label="Sold" value={formatUnits(snapshot.tokensSold, 18, 0)} sub="tokens" />
              <Stat label="Remaining" value={formatUnits(snapshot.curveSupply - snapshot.tokensSold, 18, 0)} sub="tokens" />
              <Stat label="Trade fee" value={`${(Number(feeBps) / 100).toFixed(2)}%`} sub="capped at 1.50%" />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="How this curve settles" />
            <ul className="grid gap-2.5 text-[13px] leading-relaxed text-ink-400">
              <li>
                <strong className="text-ink-200">Graduation is not a threshold anyone can move.</strong>{' '}
                The curve completes when its supply is exhausted, and the amount raised at that
                point is a pure function of its launch parameters — computable before the first
                trade ever happened.
              </li>
              <li>
                <strong className="text-ink-200">Donations cannot move the price.</strong> Reserves
                are tracked in storage rather than read from the contract’s balance, and the
                contract rejects native currency sent any other way.
              </li>
              <li>
                <strong className="text-ink-200">You are never locked in.</strong> Selling back to
                the curve is available for its entire life, not only after graduation.
              </li>
            </ul>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20">
          <Panel tone="lit">
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-[10px] border border-ink-850 bg-ink-900/50 p-1">
              {(['buy', 'sell'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSide(s);
                    setAmount('');
                    setTx(null);
                  }}
                  className={cn(
                    'rounded-[7px] py-2 text-[13.5px] font-semibold capitalize transition-colors',
                    side === s
                      ? s === 'buy'
                        ? 'bg-good-500/15 text-good-400'
                        : 'bg-alert-500/15 text-alert-400'
                      : 'text-ink-400 hover:text-ink-200',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {snapshot.graduated ? (
              <Notice tone="info" title="This curve has graduated">
                Trading has moved to the DEX pool. The curve no longer accepts buys or sells.
              </Notice>
            ) : (
              <>
                <Field
                  label={side === 'buy' ? `Amount to spend` : 'Tokens to sell'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.0"
                  suffix={side === 'buy' ? nativeSymbol : 'tokens'}
                />

                <div className="mt-4">
                  <div className="mb-1.5 text-[13px] font-medium text-ink-300">Slippage tolerance</div>
                  <div className="flex gap-1.5">
                    {[50, 100, 300].map((bps) => (
                      <button
                        key={bps}
                        type="button"
                        onClick={() => setSlippageBps(bps)}
                        className={cn(
                          'flex-1 rounded-[8px] border py-1.5 font-mono text-[12.5px] tabular transition-colors',
                          slippageBps === bps
                            ? 'border-flux-500/60 bg-flux-600/12 text-flux-300'
                            : 'border-ink-850 text-ink-400 hover:border-ink-700',
                        )}
                      >
                        {(bps / 100).toFixed(1)}%
                      </button>
                    ))}
                  </div>
                </div>

                {quote && (
                  <div className="mt-4 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
                    <Row
                      label={side === 'buy' ? 'You receive' : 'You receive'}
                      value={
                        'tokensOut' in quote
                          ? `${formatUnits(quote.tokensOut, 18, 4)} tokens`
                          : `${formatUnits(quote.nativeOut, 18, 6)} ${nativeSymbol}`
                      }
                      emphasis
                    />
                    <Row
                      label="Minimum after slippage"
                      value={
                        'minTokensOut' in quote
                          ? `${formatUnits(quote.minTokensOut, 18, 4)} tokens`
                          : `${formatUnits(quote.minNativeOut, 18, 6)} ${nativeSymbol}`
                      }
                    />
                    <Row
                      label={`Platform fee (${(Number(feeBps) / 100).toFixed(2)}%)`}
                      value={`${formatUnits(quote.fee, 18, 6)} ${nativeSymbol}`}
                    />
                    {'refund' in quote && quote.refund > 0n && (
                      <Row
                        label="Refunded (partial fill)"
                        value={`${formatUnits(quote.refund, 18, 6)} ${nativeSymbol}`}
                      />
                    )}
                    {'completesCurve' in quote && quote.completesCurve && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-good-400">
                        <Radio className="h-3 w-3" /> This buy completes the curve and triggers graduation.
                      </div>
                    )}
                  </div>
                )}

                {error && <Notice tone="alert" className="mt-4">{error}</Notice>}

                {hash && (
                  <Notice tone="good" title="Submitted" className="mt-4">
                    <span className="break-all font-mono text-[12px]">{hash}</span>
                  </Notice>
                )}

                {tx ? (
                  <div className="mt-4">
                    <TransactionReview
                      tx={tx}
                      nativeSymbol={nativeSymbol}
                      simulate={(t) => platform.simulator.simulate(t, account as `0x${string}`)}
                      onConfirm={confirm}
                      onCancel={() => setTx(null)}
                      submitting={isPending}
                    />
                    {side === 'sell' && (
                      <p className="mt-2.5 text-[12px] leading-relaxed text-ink-500">
                        This is the approval. It grants exactly the amount being sold — not an
                        unlimited allowance — and the sell itself follows once it confirms.
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    className="mt-4"
                    disabled={!isConnected || !quote}
                    onClick={prepare}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {isConnected ? `Review ${side}` : 'Connect a wallet'}
                  </Button>
                )}
              </>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12.5px] text-ink-500">{label}</span>
      <span
        className={cn(
          'truncate font-mono text-[13px] tabular',
          emphasis ? 'text-ink-100' : 'text-ink-300',
        )}
      >
        {value}
      </span>
    </div>
  );
}
