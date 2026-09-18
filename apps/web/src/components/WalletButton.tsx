import { useEffect, useRef, useState, type JSX } from 'react';
import { Wallet, X } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { Button } from './ui/index.js';

/**
 * Wallet connection.
 *
 * Offers every configured wallet rather than silently picking the first. The previous version took
 * `connectors[0]`, which on a phone's ordinary browser is the injected connector with no provider
 * behind it: the button appeared to work, threw, and showed nothing. Two things follow from that.
 * A user picks their wallet, and a failure is always visible - a connect that goes nowhere is
 * indistinguishable from a broken site.
 */
export function WalletButton(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close once a connection lands, so the sheet never lingers over a connected page.
  useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent): void => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (isConnected && address) {
    return (
      <Button variant="glass" size="pill" onClick={() => disconnect()} title="Disconnect wallet">
        <span className="h-1.5 w-1.5 rounded-full bg-good-500" aria-hidden />
        <span className="font-mono text-[12.5px]">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="pill"
        disabled={isPending}
        onClick={() => {
          reset();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{isPending ? 'Connecting…' : 'Connect wallet'}</span>
        <span className="sm:hidden">{isPending ? '…' : 'Connect'}</span>
      </Button>

      {open ? (
        <div
          ref={sheetRef}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-ink-800 bg-ink-950/95 p-1.5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Choose a wallet
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-ink-500 hover:text-ink-200"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          {connectors.map((c) => (
            <button
              key={c.uid}
              type="button"
              role="menuitem"
              onClick={() => connect({ connector: c })}
              disabled={isPending}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-100 hover:bg-ink-800/70 disabled:opacity-50"
            >
              {c.icon ? (
                <img src={c.icon} alt="" className="h-5 w-5 rounded" aria-hidden />
              ) : (
                <Wallet className="h-4 w-4 text-ink-400" aria-hidden />
              )}
              <span className="font-medium">{c.name}</span>
            </button>
          ))}

          {error ? (
            <p className="px-2.5 py-2 text-[12.5px] leading-snug text-bad-400">
              {/^user rejected/i.test(error.message)
                ? 'Cancelled in your wallet.'
                : `Could not connect: ${error.message}`}
            </p>
          ) : (
            <p className="px-2.5 py-2 text-[11.5px] leading-snug text-ink-500">
              On a phone, pick MetaMask or Coinbase Wallet to open your wallet app.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
