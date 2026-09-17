/**
 * Token profile.
 *
 * Everything here is read from chain state, not from a database. That is what lets the platform
 * serve listing pages with no backend, and it means the risk badges reflect what the contract
 * currently permits — including after an owner renounces, which a cached record would miss.
 *
 * A URL parameter loads a token directly, so a profile can be linked; without one the page offers
 * a lookup field.
 */

import type { RiskFinding, RiskReport, TokenProfile } from '@web3eco/core';
import { decodeRiskFlags, formatUnits, worstSeverity } from '@web3eco/core';
import { erc20Caip19 } from '@web3eco/adapters';
import { explorerAddressUrl } from '@web3eco/chain-registry';
import { ExternalLink, FileSearch, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { RiskBadge, RiskFindings } from '../components/RiskBadge.js';
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

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; profile: TokenProfile; findings: RiskFinding[] }
  | { status: 'error'; message: string };

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function TokenPage(): JSX.Element {
  const platform = usePlatform();
  const { address: routeAddress } = useParams<{ address: string }>();
  const [input, setInput] = useState(routeAddress ?? '');
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [risk, setRisk] = useState<RiskReport | null>(null);

  const load = useCallback(
    async (target: string): Promise<void> => {
      if (!ADDRESS_RE.test(target)) {
        setState({ status: 'error', message: 'That is not a valid contract address.' });
        return;
      }
      setState({ status: 'loading' });
      setRisk(null);
      try {
        const profile = await platform.tokens.readProfile(platform.chain, target as `0x${string}`);
        setState({ status: 'loaded', profile, findings: decodeRiskFlags(profile.riskFlags) });
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'could not read this token',
        });
        return;
      }

      try {
        setRisk(
          await platform.risk.scan(erc20Caip19(platform.chain, target as `0x${string}`)),
        );
      } catch {
        // An unreachable scanner is reported as unchecked rather than as clean.
        setRisk(null);
      }
    },
    [platform.chain, platform.tokens, platform.risk],
  );

  useEffect(() => {
    if (routeAddress) void load(routeAddress);
  }, [routeAddress, load]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
          Token profile
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          Read directly from the contract. Nothing here comes from a database that could be stale
          or edited, and the powers listed are the ones the bytecode actually grants.
        </p>
      </header>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field
              label="Contract address"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              placeholder="0x…"
              mono
              spellCheck={false}
            />
          </div>
          <Button variant="primary" size="lg" onClick={() => void load(input)}>
            <Search className="h-4 w-4" /> Look up
          </Button>
        </div>
      </Panel>

      {state.status === 'loading' && (
        <Panel>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-4 h-24 w-full" />
        </Panel>
      )}

      {state.status === 'error' && (
        <Notice tone="alert" title="Could not read that token">
          {state.message}
        </Notice>
      )}

      {state.status === 'idle' && (
        <Panel>
          <EmptyState icon={FileSearch} title="Enter a token address">
            Any ERC-20 on {platform.config.name} can be inspected here, whether or not it was
            deployed through this platform.
          </EmptyState>
        </Panel>
      )}

      {state.status === 'loaded' && (
        <>
          <Panel>
            <PanelHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {state.profile.name || 'Unnamed token'}
                  <Badge tone="neutral">{state.profile.symbol || '—'}</Badge>
                  {state.profile.template === 'unknown' ? (
                    <Badge tone="warn">Not deployed here</Badge>
                  ) : (
                    <Badge tone="flux">{state.profile.template}</Badge>
                  )}
                  <RiskBadge severity={worstSeverity(state.findings)} />
                </span>
              }
              action={
                <a
                  href={explorerAddressUrl(platform.chain, state.profile.address)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[13px] text-flux-300 hover:underline"
                >
                  Explorer <ExternalLink className="h-3.5 w-3.5" />
                </a>
              }
            />

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat
                label="Total supply"
                value={formatUnits(state.profile.totalSupply, state.profile.decimals, 0)}
                sub={state.profile.symbol}
              />
              <Stat label="Decimals" value={state.profile.decimals} />
              <Stat
                label="Deployed"
                value={
                  state.profile.deployedAt
                    ? new Date(state.profile.deployedAt * 1000).toISOString().slice(0, 10)
                    : '—'
                }
              />
              <Stat label="Template" value={state.profile.template} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-900 pt-4 text-[13px] text-ink-400">
              <span className="flex items-center gap-2">
                Contract <Address value={state.profile.address} chars={8} />
              </span>
              {state.profile.deployer && (
                <span className="flex items-center gap-2">
                  Deployer <Address value={state.profile.deployer} chars={6} />
                </span>
              )}
            </div>

            {state.profile.template === 'unknown' && (
              <Notice tone="warn" className="mt-4" title="Outside the factory registry">
                This token was not deployed through the platform's factory, so its declared risk
                flags cannot be read from the registry. The findings below come from the contract's
                own interface and from an independent scan — treat the absence of a finding as
                "not detected", not as "not present".
              </Notice>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="What this token's contract permits"
              description="Decoded from the risk flags the contract itself reports."
            />
            <RiskFindings findings={state.findings} />
          </Panel>

          <Panel>
            <PanelHeader
              title="Independent scan"
              description="A second opinion from an external scanner, run against the deployed bytecode."
            />
            {risk ? (
              <RiskFindings findings={risk.findings} />
            ) : (
              <Notice tone="warn" title="This token could not be scanned">
                The scanner was unreachable. That is not the same as a clean result — nothing has
                been checked.
              </Notice>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
