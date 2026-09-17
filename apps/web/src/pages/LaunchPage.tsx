/**
 * Degen launch: deploy a token onto a bonding curve in one transaction.
 *
 * The page states plainly what the launched token can and cannot do, shows where the curve will
 * land before the user commits, and carries the survival-rate warning unavoidably rather than in
 * a footnote — a launcher that omits the odds is selling a lottery ticket without printing them.
 */

import { formatUnits, parseUnits, sampleCurve, type TxRequest } from '@web3eco/core';
import { MIN_LP_LOCK_SECONDS } from '@web3eco/sdk';
import { Flame, Rocket, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { CurveChart } from '../components/CurveChart.js';
import { TransactionReview } from '../components/TransactionReview.js';
import {
  Badge,
  Button,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Stat,
  Toggle,
} from '../components/ui/index.js';
import { usePlatform } from '../hooks/usePlatform.js';
import { randomSalt } from '../lib/templates.js';

/**
 * Launch parameters the factory uses for every curve.
 *
 * Fixed rather than user-supplied on purpose: identical parameters mean a buyer verifies the
 * shape of the curve once instead of re-reading it per token, and a launcher cannot tune the
 * maths to their own advantage.
 */
const V_NATIVE_START = 1_500_000_000_000_000_000n;
const V_TOKEN_START = 1_073_000_000n * 10n ** 18n;
const CURVE_SUPPLY = 800_000_000n * 10n ** 18n;

export function LaunchPage(): JSX.Element {
  const { address, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [devBuy, setDevBuy] = useState('0');
  const [lockLp, setLockLp] = useState(false);
  const [salt] = useState(() => randomSalt());
  const [deployFee, setDeployFee] = useState<bigint | null>(null);
  const [predicted, setPredicted] = useState<string | null>(null);
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;

  useEffect(() => {
    let cancelled = false;
    void platform.curves
      .readDeployFee(platform.chain)
      .then((f) => {
        if (!cancelled) setDeployFee(f);
      })
      .catch(() => {
        if (!cancelled) setDeployFee(null);
      });
    return () => {
      cancelled = true;
    };
  }, [platform.chain, platform.curves]);

  /**
   * The raise at graduation, computed rather than promised.
   *
   * Because the curve's parameters are fixed, the amount it will have raised once its supply is
   * exhausted is a pure function of them — knowable before a single trade happens.
   */
  const graduationRaise = useMemo(() => {
    try {
      const points = sampleCurve(V_NATIVE_START, V_TOKEN_START, CURVE_SUPPLY, 2);
      const last = points[points.length - 1];
      return last ? last.nativeRaised : null;
    } catch {
      return null;
    }
  }, []);

  async function prepare(): Promise<void> {
    setError(null);
    setHash(null);
    try {
      const built = await platform.curves.buildLaunch({
        chain: platform.chain,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        salt,
        devBuyValue: parseUnits(devBuy || '0', 18),
        // The opening buy is priced at the curve's starting reserves, which nothing can move
        // before this transaction executes, so there is no slippage to protect against here.
        devBuyMinTokensOut: 0n,
        lockLpInsteadOfBurn: lockLp,
        lpLockDurationSeconds: lockLp ? 365 * 24 * 60 * 60 : 0,
      });
      setTx(built);

      if (address) {
        setPredicted(await platform.curves.predictCurveAddress(platform.chain, address, salt));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not prepare the launch');
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

  const ready = isConnected && name.trim() !== '' && symbol.trim() !== '';

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[32px]">
          Launch on a bonding curve
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          A fixed-supply token with no owner, no mint function, no transfer tax, no pause and no
          blocklist — not as settings switched off, but because that code does not exist in the
          template. Every launch here deploys identical logic, so a buyer verifies it once instead
          of auditing each new token.
        </p>
      </header>

      <Notice tone="warn" title="Most tokens launched this way do not graduate">
        Independent measurements of comparable platforms have put the graduation rate between
        roughly 0.4% and 3%. Most launches end with their buyers holding a token that never reaches
        a DEX pool. Do not spend money here that you need.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Your token" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                placeholder="Cold Horizon"
              />
              <Field
                label="Symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                maxLength={16}
                placeholder="HRZN"
                mono
              />
            </div>

            <div className="mt-4">
              <Field
                label="Your opening buy"
                value={devBuy}
                onChange={(e) => setDevBuy(e.target.value)}
                inputMode="decimal"
                suffix={nativeSymbol}
                hint="Optional, and capped as a share of the launch's eventual raise by a ceiling compiled into the factory. You cannot buy out your own launch."
              />
            </div>

            <div className="mt-4">
              <Toggle
                checked={lockLp}
                onChange={setLockLp}
                label={lockLp ? 'Lock liquidity for a year' : 'Burn liquidity at graduation'}
                hint={
                  lockLp
                    ? `Locked for a year in a contract with no owner and no emergency path. The contract's own floor is ${MIN_LP_LOCK_SECONDS / 86_400} days; this is far above it, but the liquidity does return to you when it expires.`
                    : 'Burning is the stronger signal: unconditional and permanent. The liquidity can never come back to you, which is exactly why buyers trust it more.'
                }
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="The curve every launch uses"
              description="Identical for every token launched here, so its shape can be checked once rather than per launch."
            />
            <CurveChart
              virtualNativeStart={V_NATIVE_START}
              virtualTokenStart={V_TOKEN_START}
              curveSupply={CURVE_SUPPLY}
              tokensSold={0n}
              height={180}
            />
            <div className="mt-5 grid grid-cols-2 gap-5 border-t border-ink-900 pt-5 sm:grid-cols-3">
              <Stat label="Curve supply" value={formatUnits(CURVE_SUPPLY, 18, 0)} sub="tokens" />
              <Stat
                label="Raise at graduation"
                value={graduationRaise === null ? '—' : formatUnits(graduationRaise, 18, 4)}
                sub={nativeSymbol}
                tone="flux"
              />
              <Stat label="Starting price" value="derived" sub="from virtual reserves" />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="What happens at graduation" />
            <ul className="grid gap-2.5 text-[13px] leading-relaxed text-ink-400">
              <li className="flex gap-2.5">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-flux-400" />
                <span>
                  <strong className="text-ink-200">A real pool is created.</strong> The curve seeds
                  an actual pair on this chain's DEX — not a routing entry on an aggregator, which
                  has no pool to add liquidity to.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-sand-400" />
                <span>
                  <strong className="text-ink-200">LP tokens are burned or locked.</strong> Chosen
                  at launch and executed by the contract. There is no third path and no manual
                  step you have to trust someone to take.
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-good-400" />
                <span>
                  <strong className="text-ink-200">Graduation is not a threshold anyone sets.</strong>{' '}
                  It happens when the curve's supply is exhausted. No operator can move it forward
                  or hold it back.
                </span>
              </li>
            </ul>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20">
          <Panel tone="lit">
            <PanelHeader
              title="Launch"
              action={<Badge tone="flux">{platform.config.shortName}</Badge>}
            />

            <div className="grid grid-cols-2 gap-5">
              <Stat
                label="Deployment fee"
                value={deployFee === null ? '—' : formatUnits(deployFee, 18, 6)}
                sub={nativeSymbol}
              />
              <Stat
                label="Opening buy"
                value={devBuy.trim() === '' ? '0' : devBuy}
                sub={nativeSymbol}
              />
            </div>

            <p className="mt-4 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5 text-[12px] leading-relaxed text-ink-500">
              The fee settles directly to the platform's fee contract — nothing routes through an
              intermediary, and the platform never holds your funds at any point. The flat fee is
              bounded by a ceiling that is immutable for the life of that contract.
            </p>

            {predicted && (
              <div className="mt-4 rounded-[10px] border border-ink-850 bg-ink-900/40 p-3.5">
                <div className="text-[11.5px] uppercase tracking-[0.07em] text-ink-500">
                  Curve address
                </div>
                <div className="mt-1 break-all font-mono text-[12.5px] text-ink-200">{predicted}</div>
              </div>
            )}

            {error && (
              <Notice tone="alert" className="mt-4">
                {error}
              </Notice>
            )}

            {hash && (
              <Notice tone="good" title="Launch submitted" className="mt-4">
                <span className="break-all font-mono text-[12px]">{hash}</span>
              </Notice>
            )}

            {tx ? (
              <div className="mt-4">
                <TransactionReview
                  tx={tx}
                  nativeSymbol={nativeSymbol}
                  simulate={(t) => platform.simulator.simulate(t, address as `0x${string}`)}
                  onConfirm={confirm}
                  onCancel={() => setTx(null)}
                  submitting={isPending}
                />
              </div>
            ) : (
              <Button variant="primary" size="lg" block className="mt-4" disabled={!ready} onClick={prepare}>
                <Rocket className="h-4 w-4" />
                {isConnected ? 'Review launch' : 'Connect a wallet to launch'}
              </Button>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
