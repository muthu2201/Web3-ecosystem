/**
 * Market listing.
 *
 * Reads every curve straight from the factory registry. There is no indexer and no database, so
 * what is listed is exactly what exists on chain — a launch cannot be hidden from this page, and
 * a delisted one cannot be silently resurrected.
 */

import type { CurveSnapshot } from '@web3eco/core';
import { formatUnits } from '@web3eco/core';
import { Radio, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  buttonClass,
  EmptyState,
  Notice,
  Panel,
  Progress,
  PulseDot,
  Skeleton,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { hasDeployment } from '@web3eco/chain-registry';

const PAGE_SIZE = 24;

type State =
  | { status: 'loading' }
  | { status: 'ready'; curves: CurveSnapshot[]; total: number }
  | { status: 'undeployed' }
  | { status: 'error'; message: string };

export function ExplorePage(): JSX.Element {
  const platform = usePlatform();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!hasDeployment(platform.chain)) {
        setState({ status: 'undeployed' });
        return;
      }
      setState({ status: 'loading' });
      try {
        const total = await platform.curves.totalCurves(platform.chain);
        // Newest first: the most recent launches are what people come to this page for.
        const offset = Math.max(0, total - PAGE_SIZE);
        const addresses = await platform.curves.listCurves(platform.chain, offset, PAGE_SIZE);
        const curves = await platform.curves.readCurves(platform.chain, [...addresses].reverse());
        if (!cancelled) setState({ status: 'ready', curves, total });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'could not read the registry',
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [platform.chain, platform.curves]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-tight">
            Live markets
          </h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-400">
            Read from the factory registry on chain. No indexer, no database — nothing here can be
            hidden or fabricated off-chain.
          </p>
        </div>
        {state.status === 'ready' && (
          <Badge tone="flux">
            <PulseDot tone="flux" />
            {state.total} launched
          </Badge>
        )}
      </header>

      {state.status === 'undeployed' && (
        <Notice tone="warn" title="Not deployed on this network">
          The platform’s contracts are not registered for the chain your wallet is on. Switch to a
          supported network to see its markets.
        </Notice>
      )}

      {state.status === 'error' && (
        <Notice tone="alert" title="Could not load markets">
          {state.message}
        </Notice>
      )}

      {state.status === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Panel key={i}>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-5 h-1.5 w-full" />
            </Panel>
          ))}
        </div>
      )}

      {state.status === 'ready' &&
        (state.curves.length === 0 ? (
          <Panel>
            <EmptyState icon={TrendingUp} title="No launches yet">
              Nothing has been launched on this network. Be the first.
            </EmptyState>
            <div className="flex justify-center">
              <Link to="/launch" className={buttonClass({ variant: 'primary', size: 'md' })}>
                Launch a token
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.curves.map((curve) => (
              <CurveCard key={curve.curve} curve={curve} symbol={platform.config.nativeCurrency.symbol} />
            ))}
          </div>
        ))}
    </div>
  );
}

function CurveCard({ curve, symbol }: { curve: CurveSnapshot; symbol: string }): JSX.Element {
  const progressBps =
    curve.curveSupply > 0n ? Number((curve.tokensSold * 10_000n) / curve.curveSupply) : 0;

  return (
    <Link to={`/curve/${curve.curve}`} className="group min-w-0">
      <Panel className="h-full transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:border-flux-600/35">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] text-ink-300">
              {curve.token.slice(0, 8)}…{curve.token.slice(-4)}
            </div>
          </div>
          {curve.graduated ? (
            <Badge tone="good">Graduated</Badge>
          ) : (
            <Badge tone="flux">
              <PulseDot tone="flux" />
              Live
            </Badge>
          )}
        </div>

        {/* A pre-seeded pool distorts the graduated price, so it is surfaced on the card rather
            than only on the detail page a user might never open. */}
        {curve.poolPreSeeded && (
          <div className="mb-3 flex items-center gap-1.5 rounded-[8px] border border-warn-500/35 bg-warn-500/10 px-2.5 py-1.5 text-[11.5px] text-warn-400">
            <Radio className="h-3 w-3 shrink-0" />
            Pool seeded before graduation
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-ink-500">Raised</div>
            <div className="truncate font-mono text-[15px] tabular text-ink-100">
              {formatUnits(curve.realNativeReserve, 18, 4)} {symbol}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-ink-500">Sold</div>
            <div className="truncate font-mono text-[15px] tabular text-ink-100">
              {(progressBps / 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <Progress value={progressBps} tone={curve.graduated ? 'good' : 'flux'} />
      </Panel>
    </Link>
  );
}
