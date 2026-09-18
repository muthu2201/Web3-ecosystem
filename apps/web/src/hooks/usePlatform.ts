/**
 * Wiring between wagmi's connected wallet and the SDK's adapters.
 *
 * The reader is built from the wallet's own EIP-1193 provider whenever one is connected, so reads
 * are served by the RPC the user already pays for. Falling back to a platform endpoint only when
 * no wallet is present is what keeps read costs near zero as usage grows.
 */

import {
  DirectRouterSwapAdapter,
  EthSimulateAdapter,
  GoPlusRiskAdapter,
  ZeroExSwapAdapter,
} from '@web3eco/adapters';
import { getChain, swapStrategy } from '@web3eco/chain-registry';
import type { Caip19, Caip2, RiskReport } from '@web3eco/core';
import { evmCaip2 } from '@web3eco/core';
import {
  BondingCurveAdapter,
  FeeRouterAdapter,
  LiquidityLockerAdapter,
  NftAdapter,
  PresaleAdapter,
  TokenFactoryAdapter,
  ViemChainReader,
} from '@web3eco/sdk';
import { useMemo } from 'react';
import { useChainId, useConnectorClient } from 'wagmi';

import { EDGE_BASE_URL, FEE_RECIPIENT, SWAP_FEE_BPS } from '../config.js';

export function useCurrentChain(): Caip2 {
  const chainId = useChainId();
  return evmCaip2(chainId);
}

/**
 * Stands in for the third-party scanner when no proxy is configured.
 *
 * An empty `sources` is the port's own way of saying nothing was checked, and the interface
 * surfaces that as "could not be scanned" rather than as a clean bill of health. Returning it
 * immediately is the honest answer, and it beats waiting on a request that cannot succeed.
 */
const UNCONFIGURED_SCANNER = {
  async scan(asset: Caip19): Promise<RiskReport> {
    return { asset, findings: [], checkedAt: Date.now(), sources: [] };
  },
};

export function usePlatform() {
  const chain = useCurrentChain();
  const { data: client } = useConnectorClient();

  return useMemo(() => {
    const provider = client?.transport as { request?: unknown } | undefined;

    const readerFor = (target: Caip2): ViemChainReader =>
      provider?.request
        ? new ViemChainReader(target, { provider: provider as never })
        : new ViemChainReader(target);

    const config = getChain(chain);
    const rpcUrl = config.publicRpcUrls[0] ?? '';

    return {
      chain,
      config,
      reader: readerFor(chain),
      tokens: new TokenFactoryAdapter(readerFor),
      curves: new BondingCurveAdapter(readerFor),
      presales: new PresaleAdapter(readerFor),
      nfts: new NftAdapter(readerFor),
      locker: new LiquidityLockerAdapter(readerFor),
      fees: new FeeRouterAdapter(readerFor),
      simulator: new EthSimulateAdapter({ rpcUrl }),
      /**
       * Swap routing.
       *
       * Aggregator where one serves the chain, direct router everywhere else. The choice is a
       * registry capability rather than a hard-coded chain list, so a testnet without 0x coverage
       * still has a working swap path instead of a dead screen.
       */
      swap:
        swapStrategy(chain) === 'aggregator' && EDGE_BASE_URL !== null
          ? new ZeroExSwapAdapter({
              // The browser never holds the 0x key; the edge Worker attaches it.
              baseUrl: EDGE_BASE_URL,
              feeRecipient: FEE_RECIPIENT,
              feeBps: SWAP_FEE_BPS,
            })
          : // No proxy configured, so the aggregator is unreachable. The direct router needs no
            // backend at all and trades against the chain's own DEX, which is a worse price on a
            // thin pair and an actual working swap rather than a dead screen.
            new DirectRouterSwapAdapter({ readerFor, feeBps: SWAP_FEE_BPS }),
      risk:
        EDGE_BASE_URL !== null
          ? new GoPlusRiskAdapter({ baseUrl: EDGE_BASE_URL })
          : UNCONFIGURED_SCANNER,
      /** True when reads are being served by the user's own wallet rather than a platform RPC. */
      usingWalletRpc: Boolean(provider?.request),
    };
  }, [chain, client]);
}
