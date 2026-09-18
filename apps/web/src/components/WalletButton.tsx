import { useEffect, useState, type JSX } from 'react';
import { ExternalLink, Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { Button } from './ui/index.js';

/** A wallet extension or in-app browser is present, so connecting is one tap. */
function hasInjectedProvider(): boolean {
  return typeof window !== 'undefined' && 'ethereum' in window;
}

/** Coarse pointer and no injected provider means a phone browser, where a deep link is the way in. */
function isHandheld(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches === true;
}

/**
 * Open this exact page inside MetaMask's own browser.
 *
 * The deep link carries host + path with no scheme, which is the format MetaMask expects. Once
 * there the page has an injected provider and connects like any desktop extension — no SDK, no
 * relay, nothing to resolve at build time.
 */
function metaMaskDeepLink(): string {
  const { host, pathname, search } = window.location;
  return `https://metamask.app.link/dapp/${host}${pathname}${search}`;
}

/**
 * Wallet connection.
 *
 * One button that connects, rather than a menu to read. A picker is only worth a user's attention
 * when the choice changes something, and here it did not: the list showed a generic "Injected"
 * entry beside two SDK connectors that could not load at all.
 *
 * So the button asks what the browser can actually do. Provider present — connect. Phone without
 * one — open in MetaMask, where a provider exists. Desktop without one — say plainly that a wallet
 * is needed, instead of failing on click.
 */
export function WalletButton(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();

  // Resolved after mount: on the server, and during hydration, neither check means anything.
  const [env, setEnv] = useState<'unknown' | 'injected' | 'handheld' | 'desktop'>('unknown');
  useEffect(() => {
    setEnv(hasInjectedProvider() ? 'injected' : isHandheld() ? 'handheld' : 'desktop');
  }, []);

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

  if (env === 'handheld') {
    return (
      <a href={metaMaskDeepLink()} className="contents">
        <Button variant="primary" size="pill">
          <Wallet className="h-3.5 w-3.5" aria-hidden />
          <span>Open in MetaMask</span>
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
        </Button>
      </a>
    );
  }

  if (env === 'desktop') {
    return (
      <div className="flex flex-col items-end gap-1">
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="contents">
          <Button variant="outline" size="pill">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            <span>Get a wallet</span>
          </Button>
        </a>
        <span className="hidden text-[11px] text-ink-500 sm:block">No wallet detected</span>
      </div>
    );
  }

  const connector = connectors[0];

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="pill"
        disabled={!connector || isPending || env === 'unknown'}
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
          {/^user rejected/i.test(error.message)
            ? 'Cancelled in your wallet.'
            : 'Could not connect. Check that your wallet is unlocked.'}
        </p>
      ) : null}
    </div>
  );
}
