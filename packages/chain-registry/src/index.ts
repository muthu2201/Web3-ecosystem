/**
 * Config-driven chain registry with explicit capability flags.
 *
 * Adding a chain must be a data change, not a code change. Everything that varies between chains
 * lives here as a declared capability, so an adapter asks the registry what a chain supports
 * rather than assuming EVM-mainnet behaviour and breaking somewhere subtle.
 *
 * The flags are not decoration. `supportsStandardCreate2` is false on the zkSync family because
 * their CREATE2 uses a different derivation entirely — assuming otherwise means computing a token
 * address, showing it to a user, and deploying somewhere else. `hasAggregatorSupport` is false on
 * every testnet because 0x does not serve them, which is why a direct-router swap path exists.
 */

import type { Caip2 } from '@web3eco/core';
import { evmCaip2 } from '@web3eco/core';

export interface NativeCurrency {
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
}

export interface ChainCapabilities {
  /**
   * CREATE2 follows the standard `keccak256(0xff ++ deployer ++ salt ++ initCodeHash)[12:]`
   * derivation. False on zkSync-family chains, whose derivation differs and whose bytecode
   * format is not EVM bytecode.
   */
  readonly supportsStandardCreate2: boolean;
  /** EIP-1153 transient storage is available (needed by ReentrancyGuardTransient). */
  readonly supportsTransientStorage: boolean;
  /** EIP-5792 `wallet_sendCalls` batching is usable for one-click multi-step flows. */
  readonly supportsBatchedCalls: boolean;
  /** An aggregator (0x/1inch) serves this chain. Testnets never do. */
  readonly hasAggregatorSupport: boolean;
  /** Contract verification is available through Etherscan's V2 multichain endpoint. */
  readonly hasEtherscanV2: boolean;
  /** The EVM version the chain's nodes actually accept. */
  readonly evmVersion: 'paris' | 'shanghai' | 'cancun';
}

export interface DexDeployment {
  readonly id: string;
  readonly kind: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2' | 'aerodrome';
  readonly router: `0x${string}`;
  readonly factory: `0x${string}`;
  readonly weth: `0x${string}`;
  /** Preferred for pool creation on this chain. Exactly one per chain should be true. */
  readonly isDefault: boolean;
  /**
   * The factory answers the two-argument `getPair(address,address)` / `createPair(address,address)`
   * that `BondingCurve._createPair` and `Presale._seedPool` call, and its pool mints a fungible
   * ERC-20 LP token.
   *
   * This is not a stylistic label. Aerodrome is a Velodrome-V2 fork whose factory only exposes
   * `getPool(address,address,bool)` — the two-argument call reverts, verified against Base
   * mainnet. A curve that graduated onto it would revert at the moment of graduation, with the
   * entire raise sitting in the contract. `poolCreationDexes()` filters on this flag so an
   * unusable venue can be listed for routing without ever being selected for pool creation.
   */
  readonly supportsV2PoolCreation: boolean;
}

export interface ChainConfig {
  readonly id: Caip2;
  readonly name: string;
  readonly shortName: string;
  readonly testnet: boolean;
  readonly nativeCurrency: NativeCurrency;
  /** Public RPCs used only as a fallback. The user's wallet RPC is always preferred. */
  readonly publicRpcUrls: readonly string[];
  readonly blockExplorer: { readonly name: string; readonly url: string };
  readonly capabilities: ChainCapabilities;
  readonly dexes: readonly DexDeployment[];
  /** Multicall3, deployed at the same address on essentially every EVM chain. */
  readonly multicall3?: `0x${string}`;
  /** Approximate block time in seconds, used to convert deadlines into block estimates. */
  readonly blockTimeSeconds: number;
}

export class ChainRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainRegistryError';
  }
}

const MULTICALL3: `0x${string}` = '0xcA11bde05977b3631167028862bE2a173976CA11';

const EVM_CANCUN: ChainCapabilities = {
  supportsStandardCreate2: true,
  supportsTransientStorage: true,
  supportsBatchedCalls: true,
  hasAggregatorSupport: true,
  hasEtherscanV2: true,
  evmVersion: 'cancun',
};

export const BASE: ChainConfig = {
  id: evmCaip2(8453),
  name: 'Base',
  shortName: 'base',
  testnet: false,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  publicRpcUrls: ['https://mainnet.base.org'],
  blockExplorer: { name: 'BaseScan', url: 'https://basescan.org' },
  capabilities: EVM_CANCUN,
  multicall3: MULTICALL3,
  blockTimeSeconds: 2,
  dexes: [
    // Uniswap V2 is the default on Base, not Aerodrome. Aerodrome has deeper liquidity, but its
    // factory reverts on the two-argument `getPair` the contracts call and its pools do not mint
    // a fungible LP token, so neither graduation nor the burn-the-LP guarantee can work there.
    {
      id: 'uniswap-v2',
      kind: 'uniswap-v2',
      router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
      factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      weth: '0x4200000000000000000000000000000000000006',
      isDefault: true,
      supportsV2PoolCreation: true,
    },
    {
      id: 'aerodrome',
      kind: 'aerodrome',
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
      weth: '0x4200000000000000000000000000000000000006',
      isDefault: false,
      supportsV2PoolCreation: false,
    },
  ],
};

export const BNB_CHAIN: ChainConfig = {
  id: evmCaip2(56),
  name: 'BNB Smart Chain',
  shortName: 'bsc',
  testnet: false,
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  publicRpcUrls: ['https://bsc-dataseed.bnbchain.org'],
  blockExplorer: { name: 'BscScan', url: 'https://bscscan.com' },
  capabilities: EVM_CANCUN,
  multicall3: MULTICALL3,
  blockTimeSeconds: 3,
  dexes: [
    {
      id: 'pancakeswap-v2',
      kind: 'pancakeswap-v2',
      router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      isDefault: true,
      supportsV2PoolCreation: true,
    },
  ],
};

export const BASE_SEPOLIA: ChainConfig = {
  id: evmCaip2(84532),
  name: 'Base Sepolia',
  shortName: 'base-sepolia',
  testnet: true,
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  publicRpcUrls: ['https://sepolia.base.org'],
  blockExplorer: { name: 'BaseScan Sepolia', url: 'https://sepolia.basescan.org' },
  capabilities: {
    ...EVM_CANCUN,
    // 0x does not serve testnets, so the swap flow must fall back to a direct router here.
    hasAggregatorSupport: false,
  },
  multicall3: MULTICALL3,
  blockTimeSeconds: 2,
  dexes: [
    {
      id: 'uniswap-v2',
      kind: 'uniswap-v2',
      router: '0x1689E7B1F10000AE47eBfE339a4f69dECd19F602',
      factory: '0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e',
      weth: '0x4200000000000000000000000000000000000006',
      isDefault: true,
      supportsV2PoolCreation: true,
    },
  ],
};

export const BSC_TESTNET: ChainConfig = {
  id: evmCaip2(97),
  name: 'BNB Smart Chain Testnet',
  shortName: 'bsc-testnet',
  testnet: true,
  nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
  // The data-seed-prebsc endpoint this used to point at is unreachable: it refuses connections
  // rather than erroring, so every read on this chain hung instead of failing. Verified working.
  publicRpcUrls: ['https://bsc-testnet-rpc.publicnode.com'],
  blockExplorer: { name: 'BscScan Testnet', url: 'https://testnet.bscscan.com' },
  capabilities: { ...EVM_CANCUN, hasAggregatorSupport: false },
  multicall3: MULTICALL3,
  blockTimeSeconds: 3,
  dexes: [
    {
      id: 'pancakeswap-v2',
      kind: 'pancakeswap-v2',
      router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
      factory: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
      weth: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      isDefault: true,
      supportsV2PoolCreation: true,
    },
  ],
};

const ALL: readonly ChainConfig[] = [BASE, BNB_CHAIN, BASE_SEPOLIA, BSC_TESTNET];

const BY_ID = new Map<string, ChainConfig>(ALL.map((c) => [c.id, c]));

export function allChains(): readonly ChainConfig[] {
  return ALL;
}

export function mainnetChains(): readonly ChainConfig[] {
  return ALL.filter((c) => !c.testnet);
}

export function testnetChains(): readonly ChainConfig[] {
  return ALL.filter((c) => c.testnet);
}

/** Look up a chain, throwing rather than returning undefined for an unsupported one. */
export function getChain(id: Caip2): ChainConfig {
  const chain = BY_ID.get(id);
  if (!chain) throw new ChainRegistryError(`chain "${id}" is not in the registry`);
  return chain;
}

export function hasChain(id: Caip2): boolean {
  return BY_ID.has(id);
}

/**
 * The DEX a new pool should be created on for this chain.
 *
 * Only ever returns a venue that can actually serve the graduation path. The previous fallback to
 * `dexes[0]` would hand back whichever venue happened to be listed first — which on Base was
 * Aerodrome, where every graduation would have reverted. Failing loudly here is strictly better
 * than returning an address that reverts at the one moment a launch's whole raise is in flight.
 */
export function defaultDex(id: Caip2): DexDeployment {
  const chain = getChain(id);
  const usable = chain.dexes.filter((d) => d.supportsV2PoolCreation);
  const dex = usable.find((d) => d.isDefault) ?? usable[0];
  if (!dex) {
    throw new ChainRegistryError(
      `chain "${id}" has no DEX that supports the V2 pool-creation path the contracts require`,
    );
  }
  return dex;
}

/** Every venue on this chain a pool may be created on. Routing may use more than these. */
export function poolCreationDexes(id: Caip2): readonly DexDeployment[] {
  return getChain(id).dexes.filter((d) => d.supportsV2PoolCreation);
}

export function getDex(id: Caip2, dexId: string): DexDeployment {
  const dex = getChain(id).dexes.find((d) => d.id === dexId);
  if (!dex) throw new ChainRegistryError(`chain "${id}" has no DEX "${dexId}"`);
  return dex;
}

/**
 * Whether a token deployed on `id` can be given a deterministic address matching other chains.
 * Callers must check this instead of assuming, or they will show a user an address that is wrong.
 */
export function supportsDeterministicAddresses(id: Caip2): boolean {
  return getChain(id).capabilities.supportsStandardCreate2;
}

/**
 * Which swap route to use on a chain.
 * Testnets have no aggregator coverage, so they fall back to a direct router call.
 */
export function swapStrategy(id: Caip2): 'aggregator' | 'direct-router' {
  return getChain(id).capabilities.hasAggregatorSupport ? 'aggregator' : 'direct-router';
}

export function explorerTxUrl(id: Caip2, hash: string): string {
  return `${getChain(id).blockExplorer.url}/tx/${hash}`;
}

export function explorerAddressUrl(id: Caip2, address: string): string {
  return `${getChain(id).blockExplorer.url}/address/${address}`;
}

/** Deployed platform contracts, per chain. Populated from the deploy manifest. */
export interface ContractAddresses {
  readonly feeRouter: `0x${string}`;
  readonly tokenFactory: `0x${string}`;
  readonly liquidityLocker: `0x${string}`;
  readonly bondingCurveFactory: `0x${string}`;
  readonly presaleFactory: `0x${string}`;
  readonly tokenVesting: `0x${string}`;
  readonly merkleDistributor: `0x${string}`;
  readonly nftFactory: `0x${string}`;
  readonly nftMarketplace: `0x${string}`;
}

const DEPLOYMENTS = new Map<string, ContractAddresses>();

/**
 * Register deployed addresses for a chain.
 *
 * Kept as runtime registration rather than a hard-coded constant so the same build can be pointed
 * at a local Anvil instance, a testnet or mainnet. The stress harness and the web app both use
 * this; nothing in the library assumes a particular deployment exists.
 */
export function registerDeployment(id: Caip2, addresses: ContractAddresses): void {
  getChain(id); // reject unknown chains loudly
  DEPLOYMENTS.set(id, addresses);
}

export function getDeployment(id: Caip2): ContractAddresses {
  const d = DEPLOYMENTS.get(id);
  if (!d) throw new ChainRegistryError(`no contract deployment registered for chain "${id}"`);
  return d;
}

export function hasDeployment(id: Caip2): boolean {
  return DEPLOYMENTS.has(id);
}

/** Register a chain that is not built in, such as a local Anvil fork. */
export function registerChain(config: ChainConfig): void {
  BY_ID.set(config.id, config);
}
