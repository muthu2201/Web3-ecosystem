/**
 * Registry invariants.
 *
 * These exist because a wrong entry here is not a cosmetic bug: the addresses in this file are
 * what a bonding curve graduates onto and what a presale seeds its pool with. Getting one wrong
 * means the failure lands at the exact moment a launch's entire raise is in flight.
 *
 * The specific defect that prompted this file: Base listed Aerodrome as its default DEX. The
 * contracts call `getPair(address,address)`; Aerodrome is a Velodrome-V2 fork whose factory only
 * exposes `getPool(address,address,bool)`, so the two-argument call reverts. Verified against
 * Base mainnet — Uniswap V2's factory returns a pair, Aerodrome's reverts. Every graduation and
 * every presale finalisation on Base would have failed.
 */

import { describe, expect, it } from 'vitest';

import {
  allChains,
  defaultDex,
  getChain,
  poolCreationDexes,
  swapStrategy,
  type ChainConfig,
} from './index.js';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

describe('every chain can actually serve the graduation path', () => {
  it.each(allChains().map((c) => [c.name, c] as const))(
    '%s has a default DEX that supports V2 pool creation',
    (_name, chain: ChainConfig) => {
      const dex = defaultDex(chain.id);
      expect(dex.supportsV2PoolCreation).toBe(true);
    },
  );

  it.each(allChains().map((c) => [c.name, c] as const))(
    '%s marks exactly one pool-creation venue as the default',
    (_name, chain: ChainConfig) => {
      const defaults = poolCreationDexes(chain.id).filter((d) => d.isDefault);
      expect(defaults).toHaveLength(1);
    },
  );

  it.each(allChains().map((c) => [c.name, c] as const))(
    '%s uses one consistent wrapped-native address across its venues',
    (_name, chain: ChainConfig) => {
      const wraps = new Set(chain.dexes.map((d) => d.weth.toLowerCase()));
      // Two different WETH addresses on one chain means one of them is wrong, and a pool seeded
      // against the wrong one is unreachable by every router that uses the other.
      expect(wraps.size).toBe(1);
    },
  );

  it.each(allChains().flatMap((c) => c.dexes.map((d) => [`${c.name}/${d.id}`, d] as const)))(
    '%s has well-formed, distinct router and factory addresses',
    (_label, dex) => {
      expect(dex.router).toMatch(ADDRESS);
      expect(dex.factory).toMatch(ADDRESS);
      expect(dex.weth).toMatch(ADDRESS);
      expect(dex.router.toLowerCase()).not.toBe(dex.factory.toLowerCase());
    },
  );
});

describe('venues that cannot serve pool creation are excluded, not silently used', () => {
  it('keeps Aerodrome listed on Base but never selects it for a pool', () => {
    const base = getChain(allChains().find((c) => c.shortName === 'base')!.id);
    const aerodrome = base.dexes.find((d) => d.id === 'aerodrome');

    // Still present: it is a real venue with real liquidity that routing may legitimately use.
    expect(aerodrome).toBeDefined();
    // But never chosen for pool creation, because the two-argument getPair reverts on it.
    expect(aerodrome?.supportsV2PoolCreation).toBe(false);
    expect(defaultDex(base.id).id).toBe('uniswap-v2');
    expect(poolCreationDexes(base.id).map((d) => d.id)).not.toContain('aerodrome');
  });

  it('never returns a non-V2 venue from defaultDex on any chain', () => {
    for (const chain of allChains()) {
      expect(defaultDex(chain.id).kind).not.toBe('aerodrome');
      expect(defaultDex(chain.id).kind).not.toBe('uniswap-v3');
    }
  });
});

describe('swap strategy follows aggregator coverage, not a hard-coded chain list', () => {
  it('routes mainnets through an aggregator and testnets through a direct router', () => {
    for (const chain of allChains()) {
      expect(swapStrategy(chain.id)).toBe(
        chain.capabilities.hasAggregatorSupport ? 'aggregator' : 'direct-router',
      );
      // No aggregator serves a testnet, so a testnet claiming coverage is a configuration error
      // that would send users into a quote endpoint that cannot answer.
      if (chain.testnet) expect(chain.capabilities.hasAggregatorSupport).toBe(false);
    }
  });

  it('gives every chain a direct-router fallback that can actually create a pool', () => {
    // The fallback is only useful if the venue behind it works, which is the same invariant as
    // above but stated from the swap side.
    for (const chain of allChains()) {
      expect(poolCreationDexes(chain.id).length).toBeGreaterThan(0);
    }
  });
});
