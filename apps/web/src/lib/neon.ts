import type { CSSProperties } from 'react';

/**
 * Domain colours.
 *
 * Each hue names a part of the system rather than a mood, so colour does navigation instead of
 * decoration: trading is cyan wherever it appears, creating is magenta wherever it appears. A user
 * three pages deep can tell what kind of thing they are looking at before reading a word.
 *
 * Signals — warning, error, success — deliberately sit outside this set. If a product hue could
 * also mean "something is wrong", neither meaning survives.
 */
export type Neon = 'flux' | 'pulse' | 'volt' | 'nova';

/** What each hue is for, kept next to the definition so it stays honest. */
export const NEON_ROLE: Record<Neon, string> = {
  flux: 'trading — curves, swaps, the primary action on a page',
  pulse: 'creation — launch, deploy, mint',
  volt: 'live state and upside — active sales, gains, confirmations',
  nova: 'raising and collecting — presales, fair launches, NFT',
};

/**
 * Set `--neon` on an element so every `.neon-*` and `.lit` rule under it picks up that hue.
 *
 * One custom property rather than a class per colour: the CSS has one set of rules, and adding a
 * fifth domain later means adding a token, not another four variants to keep in sync.
 */
export function neon(tone: Neon): CSSProperties {
  return { '--neon': `var(--color-${tone}-500)` } as CSSProperties;
}

/** The route each domain owns, used by the shell and the home page to stay in agreement. */
export const ROUTE_NEON: Record<string, Neon> = {
  '/explore': 'flux',
  '/curve': 'flux',
  '/swap': 'flux',
  '/launch': 'pulse',
  '/deploy': 'pulse',
  '/nft': 'nova',
  '/presale': 'nova',
  '/lock': 'volt',
  '/token': 'volt',
};

/** The domain a path belongs to, falling back to trading for anything unclaimed. */
export function neonForPath(pathname: string): Neon {
  const match = Object.keys(ROUTE_NEON).find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  return match ? (ROUTE_NEON[match] as Neon) : 'flux';
}
