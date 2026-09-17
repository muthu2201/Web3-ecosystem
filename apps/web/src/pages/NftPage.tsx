/**
 * NFT collections: browse what has been deployed here, or deploy one.
 *
 * Collections are full CREATE2 deploys, not proxies pointing at shared logic. That costs more gas
 * once and buys something worth having: nobody — including the platform — can change a
 * collection's behaviour after it ships.
 */

import { formatUnits, parseUnits } from '@web3eco/core';
import type { TxRequest } from '@web3eco/core';
import { MAX_ROYALTY_BPS, type CollectionSnapshot } from '@web3eco/sdk';
import { Image as ImageIcon, Images, Plus, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Progress,
  Skeleton,
  Stat,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { randomSalt } from '../lib/templates.js';
import { cn } from '../lib/cn.js';

const PAGE_SIZE = 24;

export function NftPage(): JSX.Element {
  const [tab, setTab] = useState<'browse' | 'create'>('browse');

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
            NFT collections
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            ERC-721 with on-chain mint phases, per-wallet limits, allowlists and EIP-2981
            royalties. The royalty ceiling is compiled into the contract, and metadata can be
            frozen permanently so the art cannot be swapped after sale.
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

      {tab === 'browse' ? <CollectionDirectory /> : <DeployCollection />}
    </div>
  );
}

function CollectionDirectory(): JSX.Element {
  const platform = usePlatform();
  const [collections, setCollections] = useState<CollectionSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const total = await platform.nfts.totalCollections(platform.chain);
      if (total === 0) {
        setCollections([]);
        return;
      }
      const offset = Math.max(0, total - PAGE_SIZE);
      const addresses = await platform.nfts.listCollections(platform.chain, offset, PAGE_SIZE);
      const snapshots = await platform.nfts.readCollections(platform.chain, addresses);
      setCollections([...snapshots].reverse());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not read the collection registry');
    }
  }, [platform.chain, platform.nfts]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Notice tone="alert" title="Could not load collections">
        {error}
      </Notice>
    );
  }

  if (!collections) {
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

  if (collections.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Images} title="No collections on this chain yet">
          Nothing has been deployed through the NFT factory here. Switch to the create tab to
          deploy the first.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {collections.map((c) => (
        <Link
          key={c.collection}
          to={`/nft/${c.collection}`}
          className="group block rounded-[var(--radius-panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-flux-500"
        >
          <Panel className="h-full transition-colors group-hover:border-[color-mix(in_oklch,var(--color-flux-500)_35%,transparent)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-[16px] font-semibold">{c.name || 'Untitled'}</h3>
                <div className="mt-0.5 font-mono text-[12px] text-ink-500">{c.symbol}</div>
              </div>
              {c.metadataFrozen ? (
                <Badge tone="good">
                  <ShieldCheck className="h-3 w-3" /> Frozen
                </Badge>
              ) : (
                <Badge tone="warn">Mutable art</Badge>
              )}
            </div>

            <div className="mt-4">
              <Progress
                value={c.maxSupply > 0n ? Number((c.totalMinted * 10_000n) / c.maxSupply) : 0}
                label={`${c.totalMinted.toString()} / ${c.maxSupply.toString()} minted`}
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-ink-900 pt-4">
              <span className="text-[12px] text-ink-500">{c.phaseCount} phase{c.phaseCount === 1 ? '' : 's'}</span>
              <Address value={c.collection} chars={6} />
            </div>
          </Panel>
        </Link>
      ))}
    </div>
  );
}

interface CollectionForm {
  name: string;
  symbol: string;
  baseURI: string;
  contractURI: string;
  maxSupply: string;
  royaltyBps: string;
}

const INITIAL: CollectionForm = {
  name: '',
  symbol: '',
  baseURI: 'ipfs://',
  contractURI: 'ipfs://',
  maxSupply: '10000',
  royaltyBps: '500',
};

function DeployCollection(): JSX.Element {
  const platform = usePlatform();
  const { address: account, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [form, setForm] = useState<CollectionForm>(INITIAL);
  const [salt] = useState(() => randomSalt());
  const [fee, setFee] = useState<bigint | null>(null);
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;
  const set = <K extends keyof CollectionForm>(k: K, v: CollectionForm[K]): void =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    void platform.nfts
      .readDeployFee(platform.chain)
      .then((f) => {
        if (!cancelled) setFee(f);
      })
      .catch(() => {
        // A deployment that has not been registered for this chain cannot quote a fee. The button
        // below surfaces the real error when the transaction is built.
        if (!cancelled) setFee(null);
      });
    return () => {
      cancelled = true;
    };
  }, [platform.chain, platform.nfts]);

  const royaltyError = useMemo(() => {
    const bps = Number(form.royaltyBps);
    if (!Number.isFinite(bps) || bps < 0) return 'must be a non-negative number';
    if (bps > MAX_ROYALTY_BPS) {
      return `the contract rejects anything above ${MAX_ROYALTY_BPS} bps (10%)`;
    }
    return null;
  }, [form.royaltyBps]);

  const ready =
    form.name.trim() !== '' && form.symbol.trim() !== '' && royaltyError === null && isConnected;

  async function prepare(): Promise<void> {
    if (!account) return;
    setError(null);
    setHash(null);
    try {
      setTx(
        await platform.nfts.buildDeployCollection({
          chain: platform.chain,
          name: form.name.trim(),
          symbol: form.symbol.trim(),
          baseURI: form.baseURI,
          contractURI: form.contractURI,
          maxSupply: parseUnits(form.maxSupply, 0),
          owner: account,
          royaltyReceiver: account,
          royaltyBps: Math.round(Number(form.royaltyBps)),
          salt,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the deployment');
    }
  }

  async function confirm(): Promise<void> {
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHash(sent);
      setTx(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <Panel>
          <PanelHeader title="Identity" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Collection name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Cold Horizons"
              maxLength={64}
            />
            <Field
              label="Symbol"
              value={form.symbol}
              onChange={(e) => set('symbol', e.target.value.toUpperCase())}
              placeholder="HRZN"
              maxLength={12}
              mono
            />
          </div>
          <div className="mt-4">
            <Field
              label="Maximum supply"
              value={form.maxSupply}
              onChange={(e) => set('maxSupply', e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              mono
              hint="Immutable. The contract cannot mint past it regardless of how phases are configured."
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Metadata"
            description="Point these at content-addressed storage. An HTTP URL can be repointed at different art tomorrow; an IPFS CID cannot."
          />
          <div className="grid gap-4">
            <Field
              label="Token base URI"
              value={form.baseURI}
              onChange={(e) => set('baseURI', e.target.value)}
              mono
              spellCheck={false}
              hint="tokenURI(id) resolves to this prefix followed by the id."
            />
            <Field
              label="Contract-level URI"
              value={form.contractURI}
              onChange={(e) => set('contractURI', e.target.value)}
              mono
              spellCheck={false}
              hint="Collection name, description and image, as marketplaces read it."
            />
          </div>
          <Notice tone="info" className="mt-4" title="Freezing is available later, and permanent">
            Once frozen, neither base URI can ever be changed again — not by you, not by the
            platform. Until then, the collection page shows buyers that the art is still mutable.
          </Notice>
        </Panel>

        <Panel>
          <PanelHeader title="Royalties" />
          <Field
            label="Default royalty"
            value={form.royaltyBps}
            onChange={(e) => set('royaltyBps', e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            suffix="bps"
            mono
            error={royaltyError}
            hint={`${(Number(form.royaltyBps) / 100).toFixed(2)}% under EIP-2981. Enforcement is up to each marketplace; the on-chain ceiling of ${MAX_ROYALTY_BPS / 100}% is not.`}
          />
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-20">
        <Panel tone="lit">
          <PanelHeader title="Deploy" />

          <div className="grid gap-4">
            <Stat
              label="Deployment fee"
              value={fee === null ? '—' : formatUnits(fee, 18, 6)}
              sub={nativeSymbol}
            />
            <div className="rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5 text-[12px] leading-relaxed text-ink-500">
              A flat fee bounded by a ceiling that is immutable for the life of the fee contract.
              No governance action can raise it.
            </div>
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
            <Button variant="primary" size="lg" block className="mt-4" disabled={!ready} onClick={prepare}>
              <Plus className="h-4 w-4" />
              {isConnected ? 'Review deployment' : 'Connect a wallet'}
            </Button>
          )}

          <p className="mt-4 flex gap-2 text-[12px] leading-relaxed text-ink-500">
            <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-600" />
            Mint phases are added after deployment, from the collection's own page. That keeps the
            deployment transaction small and lets you change the schedule without redeploying.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
