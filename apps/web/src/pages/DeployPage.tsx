/**
 * Token deployment across all six audited templates.
 *
 * The template picker leads with what each one lets someone do to a holder, and the risk preview
 * updates live as the choice changes — so the disclosure arrives while the user is still
 * deciding, not after they have committed.
 */

import { decodeRiskFlags, parseUnits, type TokenTemplate, type TxRequest } from '@web3eco/core';
import { AlertTriangle, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { RiskFindings } from '../components/RiskBadge.js';
import { TransactionReview } from '../components/TransactionReview.js';
import { Address, Badge, Button, Field, Notice, Panel, PanelHeader } from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { cn } from '../lib/cn.js';
import { randomSalt, TEMPLATES, templateById } from '../lib/templates.js';

export function DeployPage(): JSX.Element {
  const { address, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [template, setTemplate] = useState<TokenTemplate>('standard');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('1000000');
  const [cap, setCap] = useState('10000000');
  const [admin, setAdmin] = useState('');
  const [maxTaxBps, setMaxTaxBps] = useState('500');
  const [buyTaxBps, setBuyTaxBps] = useState('300');
  const [sellTaxBps, setSellTaxBps] = useState('300');

  const [tx, setTx] = useState<TxRequest | null>(null);
  const [predicted, setPredicted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const spec = templateById(template);
  const findings = useMemo(() => decodeRiskFlags(spec.declaredFlags), [spec.declaredFlags]);
  const effectiveAdmin = (admin.trim() || address || '') as `0x${string}`;

  const ready =
    isConnected &&
    name.trim() !== '' &&
    symbol.trim() !== '' &&
    supply.trim() !== '' &&
    (!spec.needsAdmin || /^0x[0-9a-fA-F]{40}$/.test(effectiveAdmin));

  async function prepare(): Promise<void> {
    setError(null);
    setHash(null);
    try {
      const options = {
        template,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        supply: parseUnits(supply, 18),
        recipient: address as `0x${string}`,
        salt: randomSalt(),
        ...(spec.needsAdmin ? { admin: effectiveAdmin } : {}),
        ...(spec.needsCap ? { cap: parseUnits(cap, 18) } : {}),
        ...(spec.needsTax
          ? {
              taxRecipient: effectiveAdmin,
              maxTaxBps: Number(maxTaxBps),
              buyTaxBps: Number(buyTaxBps),
              sellTaxBps: Number(sellTaxBps),
            }
          : {}),
      };

      const built = await platform.tokens.buildDeploy(platform.chain, options);
      // Shown before signing: the user sees the address their token will land on, and can check
      // it against the one that actually appears afterwards.
      const where = await platform.tokens.predictAddress(
        platform.chain,
        address as `0x${string}`,
        options,
      );
      setPredicted(where);
      setTx(built);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not prepare the deployment');
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
        <header>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-tight">
            Deploy a token
          </h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-400">
            Six audited templates rather than arbitrary feature composition. Each one declares its
            administrative powers on chain, so a wallet or listing page can render an honest badge
            without trusting anything off-chain.
          </p>
        </header>

        <Panel>
          <PanelHeader title="Template" description="Pick by what it lets someone do to a holder." />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const active = t.id === template;
              const critical = decodeRiskFlags(t.declaredFlags).some((f) => f.severity === 'critical');
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  aria-pressed={active}
                  className={cn(
                    'min-w-0 rounded-[11px] border p-3.5 text-left transition-all duration-200',
                    active
                      ? 'border-flux-500/60 bg-flux-600/10'
                      : 'border-ink-850 bg-ink-900/40 hover:border-ink-700',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ink-100">{t.name}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {critical && <AlertTriangle className="h-3.5 w-3.5 text-alert-400" aria-label="Has critical powers" />}
                      {active && <Check className="h-4 w-4 text-flux-400" aria-hidden />}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{t.summary}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {t.curveEligible && <Badge tone="good">Curve eligible</Badge>}
                    {t.routability === 'limited' && <Badge tone="warn">Limited routing</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel tone="lit">
          <PanelHeader title="Parameters" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} placeholder="Acme Token" />
            <Field
              label="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={16}
              placeholder="ACME"
            />
            <Field
              label={spec.needsCap ? 'Initial supply' : 'Total supply'}
              value={supply}
              onChange={(e) => setSupply(e.target.value)}
              inputMode="decimal"
              suffix="tokens"
              hint={spec.needsCap ? undefined : 'Minted once. Can only ever decrease, by holders burning.'}
            />
            {spec.needsCap && (
              <Field
                label="Maximum supply"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                inputMode="decimal"
                suffix="tokens"
                hint="Immutable. This is the most a holder can ever be diluted."
                error={
                  supply && cap && Number(supply) > Number(cap)
                    ? 'Initial supply cannot exceed the cap.'
                    : null
                }
              />
            )}
            {spec.needsAdmin && (
              <Field
                label="Admin address"
                value={admin}
                onChange={(e) => setAdmin(e.target.value.trim())}
                placeholder={address ?? '0x…'}
                mono
                className="sm:col-span-2"
                hint="Holds the privileged roles. Use a multisig: a single key here is a single point of failure."
                error={
                  admin.trim() !== '' && !/^0x[0-9a-fA-F]{40}$/.test(admin.trim())
                    ? 'That is not a valid address.'
                    : null
                }
              />
            )}
            {spec.needsTax && (
              <>
                <Field
                  label="Maximum tax (bps)"
                  value={maxTaxBps}
                  onChange={(e) => setMaxTaxBps(e.target.value)}
                  inputMode="numeric"
                  suffix="bps"
                  hint="Immutable ceiling. Hard-capped at 1000 bps (10%) in the contract."
                  error={Number(maxTaxBps) > 1000 ? 'The contract rejects anything above 1000 bps.' : null}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Buy tax" value={buyTaxBps} onChange={(e) => setBuyTaxBps(e.target.value)} inputMode="numeric" suffix="bps" />
                  <Field label="Sell tax" value={sellTaxBps} onChange={(e) => setSellTaxBps(e.target.value)} inputMode="numeric" suffix="bps" />
                </div>
              </>
            )}
          </div>

          {error && <Notice tone="alert" className="mt-5">{error}</Notice>}

          {hash && (
            <Notice tone="good" title="Deployment submitted" className="mt-5">
              <span className="font-mono break-all text-[12px]">{hash}</span>
            </Notice>
          )}

          {tx ? (
            <div className="mt-5">
              {predicted && (
                <Notice tone="info" title="Your token will be deployed to" className="mb-4">
                  <Address value={predicted} chars={10} />
                  <span className="mt-1 block text-[12px] text-ink-500">
                    Computed locally from the factory’s CREATE2 derivation. Check it matches after
                    the transaction confirms.
                  </span>
                </Notice>
              )}
              <TransactionReview
                tx={tx}
                nativeSymbol={platform.config.nativeCurrency.symbol}
                simulate={(t) => platform.simulator.simulate(t, address as `0x${string}`)}
                onConfirm={confirm}
                onCancel={() => setTx(null)}
                submitting={isPending}
              />
            </div>
          ) : (
            <Button variant="primary" size="lg" block className="mt-5" disabled={!ready} onClick={prepare}>
              {isConnected ? 'Review deployment' : 'Connect a wallet to deploy'}
            </Button>
          )}
        </Panel>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
        <Panel>
          <PanelHeader title={`${spec.name} template`} />
          <p className="text-[13px] leading-relaxed text-ink-400">{spec.detail}</p>
        </Panel>

        <Panel>
          <PanelHeader
            title="Powers this grants"
            description="Read from the template, and published on chain by the token itself."
          />
          <RiskFindings findings={findings} />
        </Panel>

        {spec.routability === 'limited' && (
          <Notice tone="warn" title="Limited routability">
            Fee-on-transfer breaks Uniswap v3/v4 and most aggregator routes. Pair this into a
            v2-style pool and expect it to be harder to trade.
          </Notice>
        )}
      </aside>
    </div>
  );
}
