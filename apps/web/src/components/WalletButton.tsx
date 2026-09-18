import { useEffect, useState, type JSX } from 'react';
import { Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { Button } from './ui/index.js';

/** A wallet extension or in-app browser is present, so connecting needs nothing else. */
function hasInjectedProvider(): boolean {
  return typeof window !== 'undefined' && 'ethereum' in window;
}

/**
 * Wallet connection.
 *
 * One button, one tap, no menu. Where a provider is already in the page it is used directly;
 * otherwise WalletConnect takes over, which shows a QR on a desktop and switches straight to the
 * wallet app on a phone. Either way the user never leaves this page for a browser inside another
 * app, which is what the deep link this replaced had them do.
 *
 * A failed connect always says so. A connect that silently goes nowhere is indistinguishable from
 * a broken site, and that is what shipped once already.
 */
export function WalletButton(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();

  // Resolved after mount: during hydration the check means nothing.
  const [injected, setInjected] = useState<boolean | null>(null);
  useEffect(() => setInjected(hasInjectedProvider()), []);

  if (isConnected && address) {
    return (
      <Button variant="glass" size="pill" onClick={() => disconnect()} title="Disconnect wallet">
        <span className="h-1.5 w-1.5 rounded-full bg-volt-500" aria-hidden />
        <span className="font-mono text-[12.5px]">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </Button>
    );
  }

  const walletConnect = connectors.find((c) => c.type === 'walletConnect');
  const injectedConnector = connectors.find((c) => c.type === 'injected');

  // A provider in the page beats a relay round trip; otherwise WalletConnect reaches any wallet.
  const connector = injected ? (injectedConnector ?? walletConnect) : (walletConnect ?? injectedConnector);

  const unavailable = injected === false && !walletConnect;

  if (unavailable) {
    return (
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="contents">
        <Button variant="outline" size="pill">
          <Wallet className="h-3.5 w-3.5" aria-hidden />
          <span>Get a wallet</span>
        </Button>
      </a>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="pill"
        disabled={!connector || isPending || injected === null}
        onClick={() => {
          reset();
          if (connector) connect({ connector });
        }}
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{isPending ? 'Connecting…' : 'Connect wallet'}</span>
        <span className="sm:hidden">{isPending ? '…' : 'Connect'}</span>
      </Button>

      {error ? (
        <p className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-alert-500/40 bg-ink-950/95 px-2.5 py-2 text-[12px] leading-snug text-alert-400 shadow-xl backdrop-blur">
          {/^user rejected|rejected the request/i.test(error.message)
            ? 'Cancelled in your wallet.'
            : 'Could not connect. Check that your wallet is unlocked, then try again.'}
        </p>
      ) : null}
    </div>
  );
}
