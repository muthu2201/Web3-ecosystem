/**
 * A single NFT collection: its phases, and minting from whichever one is active.
 *
 * Phase state is derived from the chain's clock rather than the browser's, because that is what
 * the contract compares against. A phase shown as open that the contract considers closed costs
 * the user gas to find out.
 */

import { formatUnits } from '@web3eco/core';
import type { TxRequest } from '@web3eco/core';
import type { CollectionSnapshot, MintPhase } from '@web3eco/sdk';
import { ArrowLeft, Lock, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { JSX } from 'react';
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

type PhaseState = 'upcoming' | 'active' | 'ended';

function phaseState(phase: MintPhase, now: number): PhaseState {
  if (now < phase.startsAt) return 'upcoming';
  if (now >= phase.endsAt) return 'ended';
  return 'active';
}

export function NftCollectionPage(): JSX.Element {
  const { address: collectionAddress } = useParams<{ address: string }>();
  const { address: account, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [collection, setCollection] = useState<CollectionSnapshot | null>(null);
  const [phases, setPhases] = useState<MintPhase[]>([]);
  const [minted, setMinted] = useState<Record<number, bigint>>({});
  const [chainNow, setChainNow] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState('1');
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;

  const refresh = useCallback(async (): Promise<void> => {
    if (!collectionAddress) return;
    setRefreshing(true);
    try {
      const target = collectionAddress as `0x${string}`;
      const [snapshot, now] = await Promise.all([
        platform.nfts.readCollection(platform.chain, target),
        platform.reader.getBlockTimestamp(),
      ]);
      setCollection(snapshot);
      setChainNow(now);

      const list = await platform.nfts.readPhases(platform.chain, target, snapshot.phaseCount);
      setPhases(list);

      if (account) {
        const counts: Record<number, bigint> = {};
        await Promise.all(
          list.map(async (_, i) => {
            counts[i] = await platform.nfts.mintedInPhase(platform.chain, target, i, account);
          }),
        );
        setMinted(counts);
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'could not read this collection');
    } finally {
      setRefreshing(false);
    }
  }, [collectionAddress, account, platform.chain, platform.nfts, platform.reader]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 20_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function prepare(): Promise<void> {
    if (!collectionAddress) return;
    setError(null);
    setHash(null);
    try {
      const qty = BigInt(quantity.replace(/[^\d]/g, '') || '0');
      setTx(
        await platform.nfts.buildMint(
          platform.chain,
          collectionAddress as `0x${string}`,
          selected,
          qty,
          [],
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the mint');
    }
  }

  async function confirm(): Promise<void> {
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHash(sent);
      setTx(null);
      setTimeout(() => void refresh(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg">
        <Notice tone="alert" title="Could not load this collection">
          {loadError}
        </Notice>
        <Link to="/nft" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-flux-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to collections
        </Link>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel>
          <Skeleton className="h-56 w-full" />
        </Panel>
        <Panel>
          <Skeleton className="h-64 w-full" />
        </Panel>
      </div>
    );
  }

  const phase = phases[selected];
  const state = phase ? phaseState(phase, chainNow) : null;
  const qty = BigInt(quantity.replace(/[^\d]/g, '') || '0');
  const cost = phase ? phase.price * qty : 0n;
  const isOwner = account?.toLowerCase() === collection.owner.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/nft" className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Collections
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {!collection.isPlatformCollection && (
        <Notice tone="alert" title="Not deployed through the platform factory">
          This address is not in the factory's registry. None of the guarantees described on this
          site apply to it.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-[22px] font-semibold">{collection.name || 'Untitled'}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-400">
                  <span className="font-mono">{collection.symbol}</span>
                  <Address value={collection.collection} chars={8} />
                </div>
              </div>
              {collection.metadataFrozen ? (
                <Badge tone="good">
                  <ShieldCheck className="h-3 w-3" /> Metadata frozen
                </Badge>
              ) : (
                <Badge tone="warn">Metadata still mutable</Badge>
              )}
            </div>

            <Progress
              value={
                collection.maxSupply > 0n
                  ? Number((collection.totalMinted * 10_000n) / collection.maxSupply)
                  : 0
              }
              label={`${collection.totalMinted.toString()} / ${collection.maxSupply.toString()} minted`}
            />

            <div className="mt-6 grid grid-cols-2 gap-5 border-t border-ink-900 pt-5 sm:grid-cols-4">
              <Stat label="Minted" value={collection.totalMinted.toString()} />
              <Stat
                label="Remaining"
                value={(collection.maxSupply - collection.totalMinted).toString()}
              />
              <Stat label="Phases" value={collection.phaseCount} />
              <Stat
                label="Proceeds held"
                value={formatUnits(collection.proceeds, 18, 4)}
                sub={nativeSymbol}
              />
            </div>

            {!collection.metadataFrozen && (
              <Notice tone="warn" className="mt-5" title="The art can still be changed">
                The owner retains the ability to repoint this collection's metadata. That is not a
                defect — it is the default until the owner freezes it — but it is worth knowing
                before you buy.
              </Notice>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Mint phases"
              description="Each phase carries its own price, window, per-wallet limit and optional allowlist."
            />
            {phases.length === 0 ? (
              <Notice tone="info" title="No phases configured">
                The owner has not opened a mint yet. Nothing can be minted until they do.
              </Notice>
            ) : (
              <ul className="grid gap-2.5">
                {phases.map((p, i) => {
                  const s = phaseState(p, chainNow);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        className={cn(
                          'w-full rounded-[10px] border p-3.5 text-left transition-colors',
                          selected === i
                            ? 'border-flux-500/55 bg-flux-600/10'
                            : 'border-ink-850 hover:border-ink-700',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-[14px] font-medium text-ink-100">
                            Phase {i}
                            {p.merkleRoot !== `0x${'0'.repeat(64)}` && (
                              <Badge tone="neutral">
                                <Lock className="h-3 w-3" /> Allowlist
                              </Badge>
                            )}
                          </span>
                          <Badge
                            tone={s === 'active' ? 'flux' : s === 'upcoming' ? 'neutral' : 'warn'}
                          >
                            {s === 'active' && <PulseDot tone="flux" />}
                            {s === 'active' ? 'Open' : s === 'upcoming' ? 'Upcoming' : 'Closed'}
                          </Badge>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <MiniStat
                            label="Price"
                            value={p.price === 0n ? 'Free' : `${formatUnits(p.price, 18, 6)} ${nativeSymbol}`}
                          />
                          <MiniStat
                            label="Per wallet"
                            value={p.maxPerWallet === 0 ? 'No limit' : String(p.maxPerWallet)}
                          />
                          <MiniStat
                            label="Phase cap"
                            value={p.maxSupply === 0 ? 'Collection cap' : String(p.maxSupply)}
                          />
                          <MiniStat
                            label="Opens"
                            value={new Date(p.startsAt * 1000).toISOString().slice(5, 16).replace('T', ' ')}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20">
          <Panel tone="lit">
            <PanelHeader title="Mint" />

            {!phase ? (
              <Notice tone="info">There is no phase to mint from yet.</Notice>
            ) : state !== 'active' ? (
              <Notice tone="warn" title={state === 'upcoming' ? 'This phase has not opened' : 'This phase has closed'}>
                Measured against the chain's clock, which is what the contract compares against.
              </Notice>
            ) : (
              <>
                <Field
                  label="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  mono
                  hint={
                    phase.maxPerWallet === 0
                      ? 'No per-wallet limit in this phase.'
                      : `You have minted ${(minted[selected] ?? 0n).toString()} of ${phase.maxPerWallet} allowed in this phase.`
                  }
                />

                <div className="mt-4 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] text-ink-500">Total</span>
                    <span className="font-mono text-[15px] tabular text-ink-100">
                      {formatUnits(cost, 18, 6)} {nativeSymbol}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                    The contract requires this amount exactly — it rejects both under- and
                    overpayment rather than keeping the difference. The platform's share comes out
                    of the collection's proceeds, not out of what you send.
                  </p>
                </div>

                {phase.merkleRoot !== `0x${'0'.repeat(64)}` && (
                  <Notice tone="warn" className="mt-4" title="Allowlist phase">
                    This phase verifies a Merkle proof of membership. Obtain yours from the
                    collection's organiser; without it the mint will revert.
                  </Notice>
                )}

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
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    className="mt-4"
                    disabled={!isConnected || qty <= 0n || phase.merkleRoot !== `0x${'0'.repeat(64)}`}
                    onClick={prepare}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isConnected ? 'Review mint' : 'Connect a wallet'}
                  </Button>
                )}
              </>
            )}

            {isOwner && (
              <div className="mt-5 border-t border-ink-900 pt-5">
                <div className="text-[13px] font-medium text-ink-300">You own this collection</div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
                  Proceeds accrue in the contract and are withdrawn by you — they are never pushed,
                  so one reverting recipient cannot block anything.
                </p>
                <Button
                  variant="outline"
                  size="md"
                  block
                  className="mt-3"
                  disabled={collection.proceeds === 0n}
                  onClick={() =>
                    void (async () => {
                      if (!account) return;
                      setError(null);
                      try {
                        setTx(
                          await platform.nfts.buildWithdrawProceeds(
                            platform.chain,
                            collection.collection,
                            account,
                          ),
                        );
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'could not build the withdrawal');
                      }
                    })()
                  }
                >
                  Withdraw {formatUnits(collection.proceeds, 18, 4)} {nativeSymbol}
                </Button>
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.06em] text-ink-600">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[12.5px] tabular text-ink-300">{value}</div>
    </div>
  );
}
