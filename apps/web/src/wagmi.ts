/**
 * Wallet and chain configuration.
 *
 * The injected connector is listed first deliberately: it uses the RPC the user's own wallet is
 * already configured with, which costs the platform nothing to serve. Platform-funded RPC is the
 * fallback, not the default, and that single choice is what keeps infrastructure spend flat as
 * traffic grows.
 *
 * ONE MODE AT A TIME. A build is either mainnet or testnet, never both, chosen by
 * VITE_CHAIN_MODE at build time:
 *
 *   - A visitor to the production site is never offered a testnet. wagmi only knows the mainnet
 *     pair, so nothing in the interface can select one and no wallet prompt can switch to one.
 *     A token "launched" on a testnet therefore cannot appear beside a real one in a listing.
 *   - A testing build does not carry the mainnet chains, so a misclick cannot spend real funds.
 *
 * To be precise about the boundary, because it is easy to overstate: the chain *registry* is a
 * data table and still holds all four entries in either bundle - their RPC URLs are present as
 * strings. What changes is the set wagmi is configured with, which is what the interface can
 * actually reach. `wagmi.test.ts` asserts that set for both modes.
 *
 * Mixing the two is what produces the fragmented experience this avoids: users seeing chains they
 * have no deployment on, wallets prompting to switch to networks nobody meant to support, and
 * worthless test tokens sitting alongside real ones.
 */

import { getChain } from '@web3eco/chain-registry';
import { evmCaip2, type Caip2 } from '@web3eco/core';
import { createConfig, http, type CreateConnectorFn } from 'wagmi';
import { base, baseSepolia, bsc, bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

import { CHAIN_MODE, WALLETCONNECT_PROJECT_ID } from './config.js';

/** Production: the two chains the platform actually targets. */
const MAINNET = [base, bsc] as const;

/**
 * Rehearsal. BSC Testnet leads because it is the one a cold wallet can fund — every Sepolia
 * faucet now requires holding a mainnet balance first, which a fresh address does not have.
 * Base Sepolia stays available for rehearsing Base itself before going live there.
 */
const TESTNET = [bscTestnet, baseSepolia] as const;

const chains = CHAIN_MODE === 'testnet' ? TESTNET : MAINNET;

/** RPC per chain, taken from the registry so there is one source of truth for endpoints. */
function rpcFor(chainId: number): string {
  return getChain(evmCaip2(chainId)).publicRpcUrls[0] ?? '';
}

/**
 * Listed explicitly rather than derived from `chains`.
 *
 * wagmi types `transports` as a Record keyed by each chain's literal id, and building it with
 * Object.fromEntries widens those keys to `string`, which does not satisfy it. Writing the four
 * out also means adding a chain fails to compile until its RPC is supplied, instead of failing
 * at runtime on the first read.
 */
const transports = {
  [base.id]: http(rpcFor(base.id)),
  [bsc.id]: http(rpcFor(bsc.id)),
  [bscTestnet.id]: http(rpcFor(bscTestnet.id)),
  [baseSepolia.id]: http(rpcFor(baseSepolia.id)),
} as const;

/**
 * Wallet connectors.
 *
 * `injected` first: when a provider is already in the page - an extension, or a wallet's own
 * in-app browser - it is the fastest path and costs nothing to serve. wagmi also adds any EIP-6963
 * provider the page announces, so someone with several extensions sees each by name.
 *
 * WalletConnect is what reaches a wallet that is not hosting the page: a QR on a desktop, a direct
 * switch to the wallet app on a phone, and it works with any wallet rather than one vendor's. It
 * replaced a deep link into MetaMask's browser, which worked but bounced the user into a second
 * browser inside another app to get there.
 *
 * It is only added when a project id is configured, because the relay refuses connections without
 * one. Earlier this file offered metaMask and coinbaseWallet whose packages pnpm does not resolve
 * from here; they survived the build and failed on click. An option that cannot work is worse than
 * one that is absent, so a connector appears only when it can actually connect.
 */
const connectors: CreateConnectorFn[] = [
  injected({ shimDisconnect: true }),
  ...(WALLETCONNECT_PROJECT_ID !== null
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: 'Web3 Ecosystem',
            description: 'Launch, trade and settle from your own wallet.',
            url: typeof window === 'undefined' ? 'https://localhost' : window.location.origin,
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports,
});

/** The CAIP-2 ids this build can reach. Used to decide what the interface offers. */
export const ACTIVE_CHAINS: readonly Caip2[] = chains.map((c) => evmCaip2(c.id));

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
