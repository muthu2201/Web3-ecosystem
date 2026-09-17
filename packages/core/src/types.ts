/**
 * Domain entities shared across the whole system.
 *
 * These are deliberately plain data with no dependency on viem, React, or any adapter. That is
 * what lets the same `TokenProfile` flow from a contract read, through a use case, into a page
 * or an MCP tool response without any of those layers knowing about each other.
 */

import type { Caip2, Caip10, Caip19 } from './caip.js';

export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type Hash = `0x${string}`;

/** Administrative powers a token grants, mirroring `RiskFlags` in Solidity. */
export const RISK_FLAGS = {
  NONE: 0n,
  MINTABLE: 1n << 0n,
  PAUSABLE: 1n << 1n,
  TAXED: 1n << 2n,
  BLOCKLIST: 1n << 3n,
  ALLOWLIST: 1n << 4n,
  CLAWBACK: 1n << 5n,
  UPGRADEABLE: 1n << 6n,
  OWNED: 1n << 7n,
  CAPPED: 1n << 8n,
  VOTES: 1n << 9n,
} as const;

export type RiskFlagName = keyof typeof RISK_FLAGS;

/** Severity used to decide how loudly the UI warns about a given power. */
export type RiskSeverity = 'none' | 'info' | 'warning' | 'critical';

/** Token templates the factory can deploy, matching `TokenFactory.Template`. */
export type TokenTemplate =
  | 'standard'
  | 'mintable'
  | 'pausable'
  | 'governance'
  | 'tax'
  | 'compliance';

/** Revenue points, matching `IFeeRouter.Product`. The ordinal is part of the on-chain ABI. */
export const PRODUCTS = [
  'tokenDeploy',
  'bondingCurveTrade',
  'graduation',
  'swap',
  'presale',
  'fairLaunch',
  'nftDeploy',
  'nftMint',
  'nftMarketplace',
] as const;

export type Product = (typeof PRODUCTS)[number];

export function productOrdinal(product: Product): number {
  return PRODUCTS.indexOf(product);
}

export interface FeeConfig {
  readonly bps: bigint;
  readonly creatorShareBps: bigint;
  readonly flatNative: bigint;
}

export interface TokenMetadata {
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly totalSupply: bigint;
}

export interface TokenProfile extends TokenMetadata {
  readonly asset: Caip19;
  readonly chain: Caip2;
  readonly address: Address;
  readonly template: TokenTemplate | 'unknown';
  readonly deployer: Address | null;
  readonly deployedAt: number | null;
  readonly riskFlags: bigint;
  readonly description?: string;
  readonly logoUri?: string;
  readonly website?: string;
  readonly socials?: Readonly<Record<string, string>>;
}

export interface CurveSnapshot {
  readonly chain: Caip2;
  readonly curve: Address;
  readonly token: Address;
  readonly creator: Address;
  readonly pair: Address;
  readonly virtualNativeReserve: bigint;
  readonly virtualTokenReserve: bigint;
  readonly realNativeReserve: bigint;
  readonly tokensSold: bigint;
  readonly curveSupply: bigint;
  readonly lpSupply: bigint;
  readonly graduated: boolean;
  readonly poolPreSeeded: boolean;
  readonly antiSnipeEndsAt: number;
  readonly maxBuyDuringWindow: bigint;
}

export type PresaleState =
  | 'pending'
  | 'live'
  | 'awaitingFinalisation'
  | 'succeeded'
  | 'failed';

export interface PresaleSnapshot {
  readonly chain: Caip2;
  readonly presale: Address;
  readonly token: Address;
  readonly owner: Address;
  readonly state: PresaleState;
  readonly softCap: bigint;
  readonly hardCap: bigint;
  readonly totalRaised: bigint;
  readonly minContribution: bigint;
  readonly maxContribution: bigint;
  readonly tokensPerNative: bigint;
  readonly liquidityTokensPerNative: bigint;
  readonly liquidityBps: bigint;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly isFairLaunch: boolean;
  readonly whitelisted: boolean;
}

/** A transaction the user must sign. Never signed by the platform. */
export interface TxRequest {
  readonly chain: Caip2;
  readonly to: Address;
  readonly data: Hex;
  readonly value: bigint;
  /** Human-readable summary rendered before the user signs. */
  readonly summary: string;
  /** Gas limit hint, when the caller has a better estimate than the wallet will make. */
  readonly gasLimit?: bigint;
}

/** A batch the wallet may submit atomically via EIP-5792, or sequentially as a fallback. */
export interface TxBatch {
  readonly chain: Caip2;
  readonly calls: readonly TxRequest[];
  readonly summary: string;
  /** True when partial execution would leave the user in a bad state and atomicity is required. */
  readonly requiresAtomicity: boolean;
}

export interface Quote {
  readonly chain: Caip2;
  readonly sellAsset: Caip19;
  readonly buyAsset: Caip19;
  readonly sellAmount: bigint;
  readonly buyAmount: bigint;
  /** Worst-case output after slippage tolerance. */
  readonly minBuyAmount: bigint;
  /** Every fee the user pays, itemised. Total user cost is the sum of these plus gas. */
  readonly fees: readonly QuoteFee[];
  readonly estimatedPriceImpactBps: bigint | null;
  readonly source: string;
  readonly expiresAt: number | null;
}

/**
 * One itemised fee.
 *
 * Quotes carry a list rather than a single number because a routed swap really does stack an LP
 * fee, an aggregator fee and the integrator fee. Collapsing them into one figure is how
 * front-ends end up understating what a user pays.
 */
export interface QuoteFee {
  readonly kind: 'liquidityProvider' | 'aggregator' | 'integrator' | 'network' | 'royalty';
  readonly label: string;
  readonly asset: Caip19;
  readonly amount: bigint;
  readonly bps: bigint | null;
}

export interface RiskFinding {
  readonly code: string;
  readonly severity: RiskSeverity;
  readonly title: string;
  readonly detail: string;
}

export interface RiskReport {
  readonly asset: Caip19;
  readonly findings: readonly RiskFinding[];
  readonly checkedAt: number;
  /** Sources consulted. Empty means nothing could be checked, which is itself worth surfacing. */
  readonly sources: readonly string[];
}

export interface SimulationResult {
  readonly success: boolean;
  readonly gasUsed: bigint | null;
  readonly revertReason: string | null;
  /** Net asset changes for the signer, as the simulation predicts them. */
  readonly balanceChanges: readonly BalanceChange[];
  readonly warnings: readonly string[];
}

export interface BalanceChange {
  readonly account: Caip10;
  readonly asset: Caip19;
  readonly delta: bigint;
}

export interface Candle {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
