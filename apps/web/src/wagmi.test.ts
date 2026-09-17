/**
 * The build-mode boundary, asserted rather than assumed.
 *
 * The claim these tests protect is narrow and worth stating exactly: a production build offers
 * only mainnet chains, and a testnet build offers only testnets. Not that testnet data is absent
 * from the bundle - the chain registry is a data table and carries all four entries either way -
 * but that the set wagmi is configured with, which is the only set the interface can reach,
 * contains one group and never both.
 *
 * Without this, a user on the live site could be prompted to switch to a testnet and end up
 * looking at worthless tokens presented exactly like real ones.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadWagmi(mode: string | undefined) {
  vi.resetModules();
  if (mode === undefined) vi.stubEnv('VITE_CHAIN_MODE', '');
  else vi.stubEnv('VITE_CHAIN_MODE', mode);
  return import('./wagmi.js');
}

const BASE = 8453;
const BNB = 56;
const BASE_SEPOLIA = 84532;
const BSC_TESTNET = 97;

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('a production build reaches mainnet only', () => {
  it('configures exactly Base and BNB Chain', async () => {
    const { wagmiConfig } = await loadWagmi(undefined);
    expect(wagmiConfig.chains.map((c) => c.id).sort()).toEqual([BNB, BASE].sort());
  });

  it('offers no testnet the user could be switched onto', async () => {
    const { wagmiConfig } = await loadWagmi(undefined);
    const ids = wagmiConfig.chains.map((c) => c.id);
    expect(ids).not.toContain(BASE_SEPOLIA);
    expect(ids).not.toContain(BSC_TESTNET);
    expect(wagmiConfig.chains.every((c) => c.testnet !== true)).toBe(true);
  });

  it('treats anything other than the literal "testnet" as production', async () => {
    // A typo or an unset variable must fail towards mainnet rather than silently shipping a
    // testnet build to real users.
    for (const value of ['', 'TESTNET', 'test', 'true', 'mainnet']) {
      const { wagmiConfig } = await loadWagmi(value);
      expect(wagmiConfig.chains.map((c) => c.id).sort()).toEqual([BNB, BASE].sort());
    }
  });
});

describe('a testnet build reaches testnets only', () => {
  it('configures exactly BSC Testnet and Base Sepolia', async () => {
    const { wagmiConfig } = await loadWagmi('testnet');
    expect(wagmiConfig.chains.map((c) => c.id).sort()).toEqual([BSC_TESTNET, BASE_SEPOLIA].sort());
  });

  it('cannot spend real funds, because no mainnet is configured', async () => {
    const { wagmiConfig } = await loadWagmi('testnet');
    const ids = wagmiConfig.chains.map((c) => c.id);
    expect(ids).not.toContain(BASE);
    expect(ids).not.toContain(BNB);
    expect(wagmiConfig.chains.every((c) => c.testnet === true)).toBe(true);
  });

  it('leads with BSC Testnet, the chain a cold wallet can actually fund', async () => {
    // Every Sepolia faucet gates on holding a mainnet balance, so a fresh address cannot start
    // there. The first chain in the list is the one a wallet defaults to.
    const { wagmiConfig } = await loadWagmi('testnet');
    expect(wagmiConfig.chains[0]?.id).toBe(BSC_TESTNET);
  });
});

describe('every configured chain has a transport', () => {
  it.each([['mainnet', undefined], ['testnet', 'testnet']] as const)(
    '%s build can actually reach each chain it offers',
    async (_label, mode) => {
      const { wagmiConfig } = await loadWagmi(mode);
      for (const chain of wagmiConfig.chains) {
        expect(wagmiConfig._internal.transports[chain.id], `no transport for ${chain.id}`).toBeDefined();
      }
    },
  );
});
