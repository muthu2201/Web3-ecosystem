/**
 * Swap.
 *
 * Routing is chosen from the chain registry's capability flags: an aggregator where one serves
 * the chain, a direct V2 router where none does. Whichever path is taken, every fee the quote
 * reports is itemised — an LP fee, the router's own fee and the platform's integrator fee really
 * do stack, and collapsing them into one number is how interfaces end up understating what a
 * user pays.
 */

import { erc20Caip19, nativeAssetOf } from '@web3eco/adapters';
import type { Quote, RiskReport, TokenProfile, TxRequest } from '@web3eco/core';
import { formatUnits, parseUnits } from '@web3eco/core';
import { swapStrategy } from '@web3eco/chain-registry';
import { ArrowDownUp, Route, Search, Wallet } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { FeeDisclosure } from '../components/FeeDisclosure.js';
import { RiskFindings, RiskGate } from '../components/RiskBadge.js';
import { TransactionReview } from '../components/TransactionReview.js';
import {
  Address,
  Badge,
  Button,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { cn } from '../lib/cn.js';

type Direction = 'nativeToToken' | 'tokenToNative';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function SwapPage(): JSX.Element {
  const platform = usePlatform();
  const { address: account, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [tokenInput, setTokenInput] = useState('');
  const [direction, setDirection] = useState<Direction>('nativeToToken');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(100);

  const [profile, setProfile] = useState<TokenProfile | null>(null);
  const [risk, setRisk] = useState<RiskReport | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [pending, setPending] = useState<readonly TxRequest[]>([]);
  const [step, setStep] = useState(0);
  const [hashes, setHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;
  const strategy = swapStrategy(platform.chain);
  const token = ADDRESS_RE.test(tokenInput.trim())
    ? (tokenInput.trim() as `0x${string}`)
    : null;

  // Load the token's profile and an independent risk scan as soon as a valid address is entered.
  useEffect(() => {
    if (!token) {
      setProfile(null);
      setRisk(null);
      setTokenError(null);
      return;
    }
    let cancelled = false;
    setLoadingToken(true);
    setTokenError(null);

    void (async () => {
      try {
        const p = await platform.tokens.readProfile(platform.chain, token);
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setTokenError(err instanceof Error ? err.message : 'could not read that token');
        }
      } finally {
        if (!cancelled) setLoadingToken(false);
      }

      try {
        const report = await platform.risk.scan(erc20Caip19(platform.chain, token));
        if (!cancelled) setRisk(report);
      } catch {
        // A risk scanner being unreachable is not the same as a token being clean, and the UI
        // says so below rather than rendering an empty findings list as reassurance.
        if (!cancelled) setRisk(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, platform.chain, platform.tokens, platform.risk]);

  const request = useMemo(() => {
    if (!token || !account || amount.trim() === '') return null;
    try {
      const decimals = direction === 'nativeToToken' ? 18 : (profile?.decimals ?? 18);
      const sellAmount = parseUnits(amount, decimals);
      if (sellAmount <= 0n) return null;
      return {
        chain: platform.chain,
        sellAsset:
          direction === 'nativeToToken'
            ? nativeAssetOf(platform.chain)
            : erc20Caip19(platform.chain, token),
        buyAsset:
          direction === 'nativeToToken'
            ? erc20Caip19(platform.chain, token)
            : nativeAssetOf(platform.chain),
        sellAmount,
        taker: account,
        slippageBps,
      } as const;
    } catch {
      return null;
    }
  }, [token, account, amount, direction, profile, platform.chain, slippageBps]);

  async function fetchQuote(): Promise<void> {
    if (!request) return;
    setQuoting(true);
    setQuoteError(null);
    setQuote(null);
    try {
      setQuote(await platform.swap.quote(request as never));
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'no route was found for this pair');
    } finally {
      setQuoting(false);
    }
  }

  async function prepare(): Promise<void> {
    if (!request || !quote) return;
    setError(null);
    try {
      const batch = await platform.swap.buildSwap(request as never, quote);
      setPending(batch.calls);
      setStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the swap');
    }
  }

  async function confirm(): Promise<void> {
    const tx = pending[step];
    if (!tx) return;
    try {
      const sent = await sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value });
      setHashes((h) => [...h, sent]);
      if (step + 1 < pending.length) {
        setStep(step + 1);
      } else {
        setPending([]);
        setStep(0);
        setAmount('');
        setQuote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the wallet rejected the transaction');
    }
  }

  const buyDecimals = direction === 'nativeToToken' ? (profile?.decimals ?? 18) : 18;
  const buySymbol = direction === 'nativeToToken' ? (profile?.symbol ?? 'tokens') : nativeSymbol;
  const sellSymbol = direction === 'nativeToToken' ? nativeSymbol : (profile?.symbol ?? 'tokens');
  const current = pending[step] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
          Swap
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          Routed through {strategy === 'aggregator' ? 'an aggregator' : "the chain's own DEX router"}{' '}
          on {platform.config.name}. Every fee is itemised before you sign, and the platform's
          share is bounded by a ceiling compiled into the fee contract.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
        <Panel tone="lit" className="lg:sticky lg:top-20">
          <Field
            label="Token address"
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
              setQuote(null);
            }}
            placeholder="0x…"
            mono
            spellCheck={false}
            error={tokenError}
            hint="Any ERC-20 on this chain, not only tokens launched here."
          />

          <div className="mt-4 flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-[10px] border border-ink-850 bg-ink-900/40 px-3.5 py-2.5">
              <div className="text-[11.5px] uppercase tracking-[0.07em] text-ink-500">You pay</div>
              <div className="mt-0.5 truncate font-mono text-[14px] text-ink-100">{sellSymbol}</div>
            </div>
            <Button
              variant="glass"
              size="icon"
              aria-label="Reverse direction"
              onClick={() => {
                setDirection((d) => (d === 'nativeToToken' ? 'tokenToNative' : 'nativeToToken'));
                setAmount('');
                setQuote(null);
              }}
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 rounded-[10px] border border-ink-850 bg-ink-900/40 px-3.5 py-2.5">
              <div className="text-[11.5px] uppercase tracking-[0.07em] text-ink-500">
                You receive
              </div>
              <div className="mt-0.5 truncate font-mono text-[14px] text-ink-100">{buySymbol}</div>
            </div>
          </div>

          <div className="mt-4">
            <Field
              label={`Amount to sell`}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setQuote(null);
              }}
              inputMode="decimal"
              placeholder="0.0"
              suffix={sellSymbol}
            />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-[13px] font-medium text-ink-300">Slippage tolerance</div>
            <div className="flex gap-1.5">
              {[50, 100, 300].map((bps) => (
                <button
                  key={bps}
                  type="button"
                  onClick={() => {
                    setSlippageBps(bps);
                    setQuote(null);
                  }}
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

          <Button
            variant="glass"
            size="lg"
            block
            className="mt-4"
            disabled={!request || quoting}
            onClick={fetchQuote}
          >
            <Search className="h-4 w-4" />
            {quoting ? 'Finding a route…' : isConnected ? 'Get quote' : 'Connect a wallet'}
          </Button>

          {quoteError && (
            <Notice tone="warn" title="No route" className="mt-4">
              {quoteError}
            </Notice>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          {loadingToken && (
            <Panel>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-3 h-20 w-full" />
            </Panel>
          )}

          {profile && (
            <Panel>
              <PanelHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {profile.name || 'Unnamed token'}
                    <Badge tone="neutral">{profile.symbol || '—'}</Badge>
                    {profile.template === 'unknown' ? (
                      <Badge tone="warn">Not deployed here</Badge>
                    ) : (
                      <Badge tone="flux">{profile.template}</Badge>
                    )}
                  </span>
                }
                description={
                  profile.template === 'unknown'
                    ? 'This token was not deployed through this platform, so its risk flags cannot be read from the factory registry. The independent scan below is all that is available.'
                    : undefined
                }
                action={<Address value={profile.address} chars={6} />}
              />
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Stat
                  label="Supply"
                  value={formatUnits(profile.totalSupply, profile.decimals, 0)}
                  sub={profile.symbol}
                />
                <Stat label="Decimals" value={profile.decimals} />
                <Stat
                  label="Deployed"
                  value={
                    profile.deployedAt
                      ? new Date(profile.deployedAt * 1000).toISOString().slice(0, 10)
                      : '—'
                  }
                />
              </div>
            </Panel>
          )}

          {token && (
            <Panel>
              <PanelHeader
                title="Independent risk scan"
                description="Run against the token contract itself, not a curated list."
              />
              {risk ? (
                <RiskFindings findings={risk.findings} />
              ) : (
                <Notice tone="warn" title="This token could not be scanned">
                  The scanner was unreachable. That is not the same as a clean result — nothing
                  has been checked. Treat the token as unverified.
                </Notice>
              )}
            </Panel>
          )}

          {quote && (
            <Panel tone="strong">
              <PanelHeader
                title="Quote"
                action={
                  <Badge tone="flux">
                    <Route className="h-3 w-3" /> {quote.source}
                  </Badge>
                }
              />
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Stat
                  label="You receive"
                  value={formatUnits(quote.buyAmount, buyDecimals, 6)}
                  sub={buySymbol}
                  tone="flux"
                />
                <Stat
                  label="Minimum received"
                  value={formatUnits(quote.minBuyAmount, buyDecimals, 6)}
                  sub={`at ${(slippageBps / 100).toFixed(1)}% slippage`}
                />
                <Stat
                  label="Price impact"
                  value={
                    quote.estimatedPriceImpactBps === null
                      ? 'not reported'
                      : `${(Number(quote.estimatedPriceImpactBps) / 100).toFixed(2)}%`
                  }
                />
              </div>

              <div className="mt-5">
                <FeeDisclosure
                  fees={quote.fees}
                  decimals={direction === 'nativeToToken' ? 18 : (profile?.decimals ?? 18)}
                  symbol={sellSymbol}
                  hardCapBps={100}
                />
              </div>

              <RiskGate findings={risk?.findings ?? []}>
                {(acknowledged) =>
                  current ? (
                    <div className="mt-5">
                      {pending.length > 1 && (
                        <div className="mb-3 text-[12.5px] text-ink-500">
                          Step {step + 1} of {pending.length}
                        </div>
                      )}
                      <TransactionReview
                        tx={current}
                        nativeSymbol={nativeSymbol}
                        simulate={(t) =>
                          platform.simulator.simulate(t, account as `0x${string}`)
                        }
                        onConfirm={confirm}
                        onCancel={() => {
                          setPending([]);
                          setStep(0);
                        }}
                        submitting={isPending}
                      />
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      block
                      className="mt-5"
                      disabled={!acknowledged || !isConnected}
                      onClick={prepare}
                    >
                      <Wallet className="h-4 w-4" /> Review swap
                    </Button>
                  )
                }
              </RiskGate>
            </Panel>
          )}

          {error && <Notice tone="alert">{error}</Notice>}

          {hashes.length > 0 && (
            <Notice tone="good" title="Submitted">
              {hashes.map((h) => (
                <div key={h} className="break-all font-mono text-[12px]">
                  {h}
                </div>
              ))}
            </Notice>
          )}

          {!token && !loadingToken && (
            <Panel>
              <PanelHeader title="How routing is chosen" />
              <ul className="grid gap-2.5 text-[13px] leading-relaxed text-ink-400">
                <li>
                  <strong className="text-ink-200">An aggregator where one serves the chain.</strong>{' '}
                  Its API key never reaches this page — requests go through the platform's edge
                  worker, which attaches the key server-side.
                </li>
                <li>
                  <strong className="text-ink-200">A direct router everywhere else.</strong>{' '}
                  Testnets have no aggregator coverage, so a single-hop route against the chain's
                  own V2 pool is used instead of showing a dead screen.
                </li>
                <li>
                  <strong className="text-ink-200">Approvals are exact.</strong> Where an ERC-20
                  approval is needed, it is for the amount being sold — never unlimited.
                </li>
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
