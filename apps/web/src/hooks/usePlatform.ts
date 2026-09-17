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
import type { Caip2 } from '@web3eco/core';
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
        swapStrategy(chain) === 'aggregator'
          ? new ZeroExSwapAdapter({
              // The browser never holds the 0x key; the edge Worker attaches it.
              baseUrl: EDGE_BASE_URL,
              feeRecipient: FEE_RECIPIENT,
              feeBps: SWAP_FEE_BPS,
            })
          : new DirectRouterSwapAdapter({ readerFor, feeBps: SWAP_FEE_BPS }),
      risk: new GoPlusRiskAdapter({ baseUrl: EDGE_BASE_URL }),
      /** True when reads are being served by the user's own wallet rather than a platform RPC. */
      usingWalletRpc: Boolean(provider?.request),
    };
  }, [chain, client]);
}
