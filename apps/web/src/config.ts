/**
 * Runtime configuration.
 *
 * Contract addresses are registered at startup rather than compiled in, so the same bundle can be
 * pointed at a local node, a testnet or mainnet. Nothing secret appears here: everything the
 * browser holds is public, which is why API keys live behind the edge Worker instead.
 */

import { registerDeployment, type ContractAddresses } from '@web3eco/chain-registry';
import type { Caip2 } from '@web3eco/core';
import { evmCaip2 } from '@web3eco/core';

/**
 * The key-hiding proxy, or null when none is configured.
 *
 * It used to default to an example.workers.dev placeholder, which resolves nowhere. Every swap
 * quote and every risk scan was fired at a host that does not exist and waited for DNS to fail,
 * in production, for real users. A default that cannot work is worse than none: absent, the app
 * can choose a path that does work.
 */
export const EDGE_BASE_URL: string | null = import.meta.env.VITE_EDGE_URL ?? null;

/**
 * WalletConnect project id, or null when none is set.
 *
 * Free from cloud.reown.com and public by design - it identifies this app to the relay and is
 * visible in every session, so it is build configuration rather than a secret. Without it the
 * relay refuses connections, so the connector is only offered when it is present: an option that
 * cannot work is worse than one that is absent.
 */
export const WALLETCONNECT_PROJECT_ID: string | null =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? null;

/** Integrator fee in basis points. The FeeRouter caps swaps at 100 bps on chain. */
export const SWAP_FEE_BPS = Number(import.meta.env.VITE_SWAP_FEE_BPS ?? 25);

/**
 * Address the aggregator's integrator fee is paid to.
 *
 * Public by definition — it appears in every swap calldata — so there is nothing to hide here.
 * It is read from build configuration rather than hard-coded so the same bundle can be pointed
 * at a test treasury, and validated at startup because a malformed recipient would send fees to
 * an address nobody controls.
 */
export const FEE_RECIPIENT = (import.meta.env.VITE_FEE_RECIPIENT ??
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

/**
 * Which set of chains this build targets. Never both at once - see wagmi.ts for why.
 *
 * Anything other than the literal "testnet" means mainnet, so a typo or a missing variable fails
 * towards production rather than silently shipping a testnet build to real users.
 */
export const CHAIN_MODE: 'mainnet' | 'testnet' =
  import.meta.env.VITE_CHAIN_MODE === 'testnet' ? 'testnet' : 'mainnet';

/** Kept for callers that want the mainnet pair regardless of build mode. */
export const SUPPORTED_CHAINS: readonly Caip2[] = [evmCaip2(8453), evmCaip2(56)];

/**
 * Register deployments from build-time configuration.
 *
 * Throws loudly for a malformed address rather than starting with a broken one: a silently wrong
 * contract address means a user's transaction goes somewhere unintended.
 */
export function registerDeployments(): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(FEE_RECIPIENT)) {
    throw new Error(`VITE_FEE_RECIPIENT is malformed: ${FEE_RECIPIENT}`);
  }
  if (!Number.isInteger(SWAP_FEE_BPS) || SWAP_FEE_BPS < 0 || SWAP_FEE_BPS > 100) {
    // 100 bps is the ceiling the FeeRouter enforces in bytecode for swaps. Requesting more from
    // an aggregator would charge a fee the platform has publicly promised it cannot charge.
    throw new Error(`VITE_SWAP_FEE_BPS must be between 0 and 100, got ${SWAP_FEE_BPS}`);
  }

  const raw = import.meta.env.VITE_DEPLOYMENTS;
  if (!raw) return;

  let parsed: Record<string, ContractAddresses>;
  try {
    parsed = JSON.parse(raw) as Record<string, ContractAddresses>;
  } catch {
    throw new Error('VITE_DEPLOYMENTS is not valid JSON');
  }

  for (const [chain, addresses] of Object.entries(parsed)) {
    for (const [name, address] of Object.entries(addresses)) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new Error(`deployment address for "${name}" on ${chain} is malformed: ${address}`);
      }
    }
    registerDeployment(chain as Caip2, addresses);
  }
}
