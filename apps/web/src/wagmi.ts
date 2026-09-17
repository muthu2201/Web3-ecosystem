/**
 * Wallet and chain configuration.
 *
 * The injected connector is listed first deliberately: it uses the RPC the user's own wallet is
 * already configured with, which costs the platform nothing to serve. Platform-funded RPC is the
 * fallback, not the default, and that single choice is what keeps infrastructure spend flat as
 * traffic grows.
 */

import { getChain } from '@web3eco/chain-registry';
import { evmCaip2 } from '@web3eco/core';
import { createConfig, http } from 'wagmi';
import { base, bsc } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const baseConfig = getChain(evmCaip2(8453));
const bscConfig = getChain(evmCaip2(56));

export const wagmiConfig = createConfig({
  chains: [base, bsc],
  connectors: [injected()],
  transports: {
    [base.id]: http(baseConfig.publicRpcUrls[0]),
    [bsc.id]: http(bscConfig.publicRpcUrls[0]),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
