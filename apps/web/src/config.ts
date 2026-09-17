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

export const EDGE_BASE_URL =
  import.meta.env.VITE_EDGE_URL ?? 'https://web3eco-edge.example.workers.dev';

/** Integrator fee in basis points. The FeeRouter caps swaps at 100 bps on chain. */
export const SWAP_FEE_BPS = Number(import.meta.env.VITE_SWAP_FEE_BPS ?? 25);

export const SUPPORTED_CHAINS: readonly Caip2[] = [evmCaip2(8453), evmCaip2(56)];

/**
 * Register deployments from build-time configuration.
 *
 * Throws loudly for a malformed address rather than starting with a broken one: a silently wrong
 * contract address means a user's transaction goes somewhere unintended.
 */
export function registerDeployments(): void {
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
