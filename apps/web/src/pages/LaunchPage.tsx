/**
 * Degen launch: deploy a token onto a bonding curve in one transaction.
 *
 * The page states plainly what the launched token can and cannot do, and shows the graduation
 * target before the user commits. It also carries the survival-rate warning the blueprint calls
 * unavoidable — roughly 1-3% of bonding-curve tokens have historically graduated — because a
 * launcher that omits that is selling a lottery ticket without printing the odds.
 */

import { formatUnits, parseUnits, type TxRequest } from '@web3eco/core';
import { useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { TransactionReview } from '../components/TransactionReview.js';
import { usePlatform } from '../hooks/usePlatform.js';

export function LaunchPage(): JSX.Element {
  const { address, isConnected } = useAccount();
  const platform = usePlatform();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [devBuy, setDevBuy] = useState('0');
  const [lockLp, setLockLp] = useState(false);
  const [tx, setTx] = useState<TxRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const nativeSymbol = platform.config.nativeCurrency.symbol;

  async function prepare(): Promise<void> {
    setError(null);
    try {
      const salt = randomSalt();
      const built = await platform.curves.buildLaunch({
        chain: platform.chain,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        salt,
        devBuyValue: parseUnits(devBuy || '0', 18),
        devBuyMinTokensOut: 0n,
        lockLpInsteadOfBurn: lockLp,
        lpLockDurationSeconds: lockLp ? 365 * 24 * 60 * 60 : 0,
      });
      setTx(built);
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

  return (
    <section style={{ display: 'grid', gap: 18, maxWidth: 620 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 22 }}>Launch on a bonding curve</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: 14, lineHeight: 1.6 }}>
          Your token is deployed with a fixed supply and no owner. It has no mint function, no
          transfer tax, no pause and no blocklist — not as settings left switched off, but because
          that code does not exist in this template. Every launch here deploys identical logic, so
          a buyer verifies it once instead of auditing each new token.
        </p>
      </header>

      <div
        style={{
          border: '1px solid #b98d2f',
          background: '#3a2c0d',
          color: '#ffddad',
          borderRadius: 6,
          padding: 12,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>Most tokens launched this way do not graduate.</strong> Independent measurements of
        comparable platforms have put the graduation rate between roughly 0.4% and 3%. Most
        launches end with their buyers holding a token that never reaches a DEX pool. Do not spend
        money here that you need.
      </div>

      <label style={field}>
        <span style={label}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} style={input} />
      </label>

      <label style={field}>
        <span style={label}>Symbol</span>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          maxLength={16}
          style={input}
        />
      </label>

      <label style={field}>
        <span style={label}>Your opening buy ({nativeSymbol}, optional)</span>
        <input
          value={devBuy}
          onChange={(e) => setDevBuy(e.target.value)}
          inputMode="decimal"
          style={input}
        />
        <span style={hint}>
          Capped as a share of the launch&rsquo;s eventual raise, under a ceiling compiled into the
          factory. You cannot buy out your own launch.
        </span>
      </label>

      <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={lockLp} onChange={(e) => setLockLp(e.target.checked)} />
        <span style={{ fontSize: 14 }}>
          Lock liquidity for a year instead of burning it
          <span style={{ ...hint, display: 'block' }}>
            Burning is the stronger signal: it is unconditional and permanent. A lock returns the
            liquidity to you when it expires.
          </span>
        </span>
      </label>

      {error && <ErrorBox message={error} />}

      {hash && (
        <div style={{ ...successBox }}>
          Launch submitted. Transaction: <code style={{ wordBreak: 'break-all' }}>{hash}</code>
        </div>
      )}

      {tx ? (
        <TransactionReview
          tx={tx}
          nativeSymbol={nativeSymbol}
          simulate={(t) => platform.simulator.simulate(t, address as `0x${string}`)}
          onConfirm={confirm}
          onCancel={() => setTx(null)}
          submitting={isPending}
        />
      ) : (
        <button
          type="button"
          onClick={prepare}
          disabled={!isConnected || name.trim() === '' || symbol.trim() === ''}
          style={{
            ...primaryButton,
            opacity: isConnected && name.trim() && symbol.trim() ? 1 : 0.45,
          }}
        >
          {isConnected ? 'Review launch' : 'Connect a wallet to launch'}
        </button>
      )}

      <p style={{ ...hint, marginTop: 0 }}>
        Deployment costs a small flat fee plus network gas. The fee is disclosed in the review step
        and settles directly to the platform&rsquo;s fee contract — nothing routes through an
        intermediary, and the platform never holds your funds at any point.
      </p>
    </section>
  );
}

function ErrorBox({ message }: { message: string }): JSX.Element {
  return (
    <div
      style={{
        border: '1px solid #b9382f',
        background: '#3a0d0d',
        color: '#ffb4ad',
        borderRadius: 6,
        padding: 12,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export { formatUnits };

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600 };
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.65, lineHeight: 1.5 };
const input: React.CSSProperties = {
  padding: '9px 11px',
  borderRadius: 6,
  border: '1px solid #3a3a3a',
  background: '#111',
  color: 'inherit',
  fontSize: 14,
};
const primaryButton: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: 6,
  border: '1px solid #3b82f6',
  background: '#1d4ed8',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};
const successBox: React.CSSProperties = {
  border: '1px solid #2f9457',
  background: '#0d2a18',
  color: '#a9f0c6',
  borderRadius: 6,
  padding: 12,
  fontSize: 13,
};
