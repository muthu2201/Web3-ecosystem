import { Menu, X } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { cn } from '../lib/cn.js';
import { Backdrop } from './Backdrop.js';
import { WalletButton } from './WalletButton.js';
import { usePlatform } from '../hooks/usePlatform.js';

const NAV = [
  { to: '/explore', label: 'Explore' },
  { to: '/launch', label: 'Launch' },
  { to: '/deploy', label: 'Deploy' },
  { to: '/swap', label: 'Swap' },
  { to: '/presale', label: 'Presales' },
  { to: '/nft', label: 'NFT' },
  { to: '/lock', label: 'Lock' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const platform = usePlatform();

  // Close the drawer on navigation, otherwise it stays open over the page just requested.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open so the page behind does not scroll under it.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="grain relative flex min-h-dvh flex-col">
      <Backdrop />

      <header className="sticky top-0 z-40 border-b border-ink-900/80 bg-ink-950/72 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* -mx-1 px-1 widens the tap target to the header's full height without moving the mark */}
          <Link
            to="/"
            className="-mx-1 flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-1"
            aria-label="Home"
          >
            <Mark />
            <span className="hidden font-display text-[15px] font-semibold tracking-tight text-ink-100 sm:inline">
              Web3 Ecosystem
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-[var(--radius-pill)] px-3 py-1.5 text-[13.5px] transition-colors',
                    isActive
                      ? 'bg-ink-850 text-ink-100'
                      : 'text-ink-400 hover:bg-ink-900 hover:text-ink-200',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] border border-ink-850 px-2.5 py-1 text-[11px] text-ink-500 md:inline-flex"
              title={
                platform.usingWalletRpc
                  ? 'Reads are served by your own wallet RPC, so this site is not routing your activity through its own endpoint.'
                  : 'Connect a wallet and reads will be served by your own RPC instead of a public one.'
              }
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  platform.usingWalletRpc ? 'bg-good-500' : 'bg-ink-600',
                )}
              />
              {platform.usingWalletRpc ? 'your RPC' : 'public RPC'}
            </span>

            <WalletButton />

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-[10px] p-2 text-ink-300 transition-colors hover:bg-ink-900 hover:text-ink-100 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 top-14 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative mx-4 mt-3 grid gap-1 rounded-[var(--radius-shell)] glass-strong p-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-[10px] px-4 py-3 text-[15px] transition-colors',
                    isActive ? 'bg-flux-600/14 text-flux-300' : 'text-ink-300 hover:bg-ink-850',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <main className="relative z-0 mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <Footer />
    </div>
  );
}

function Mark(): JSX.Element {
  // The logo is the curve: a rising arc under a horizon line.
  return (
    <span className="grid h-7 w-7 place-items-center rounded-[9px] border border-flux-600/40 bg-flux-600/12">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M3 19c5.5 0 9-2.2 11-6.5C15.6 9 17.2 6.3 21 5"
          stroke="var(--color-flux-400)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="21" cy="5" r="2" fill="var(--color-flux-400)" />
      </svg>
    </span>
  );
}

function Footer(): JSX.Element {
  return (
    <footer className="relative z-0 mt-auto border-t border-ink-900/80">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <Mark />
              <span className="font-display text-[14px] font-semibold text-ink-200">Web3 Ecosystem</span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-500">
              Non-custodial. This interface never holds your funds and cannot sign on your behalf —
              every action is a transaction you approve in your own wallet.
            </p>
          </div>

          <div className="text-[12.5px] leading-relaxed text-ink-500 sm:text-right">
            <p className="font-medium text-warn-400">These contracts have not had a paid audit.</p>
            <p className="mt-1 max-w-xs sm:ml-auto">
              Two of them hold user funds. Read SECURITY.md before committing real value.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
