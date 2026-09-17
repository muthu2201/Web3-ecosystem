/**
 * Port interfaces: the boundary between what the platform does and who it does it through.
 *
 * Every external dependency in this system — 0x, Jupiter, GoPlus, GeckoTerminal, Pinata,
 * Etherscan — has its own terms, its own uptime, its own rate limits and its own opinion about
 * which jurisdictions it will serve. Any one of them can change or disappear. Depending on their
 * SDKs directly would mean a provider outage is an outage for the whole product, and swapping one
 * out is a refactor rather than a config change.
 *
 * So the application layer only ever sees these interfaces. Adapters implement them.
 *
 * The rule that matters most: NO PORT EVER SIGNS ANYTHING. Every state-changing operation returns
 * a `TxRequest` for the user's wallet to sign. There is no `sendTransaction` on any interface
 * here and no place to put a private key. That is what makes the system non-custodial in fact
 * rather than in marketing copy, and it is the line the US money-transmission cases turn on.
 */

import type {
  Address,
  Caip2,
  Caip19,
  Candle,
  CurveSnapshot,
  FeeConfig,
  Hex,
  PresaleSnapshot,
  Product,
  Quote,
  RiskReport,
  SimulationResult,
  Timeframe,
  TokenProfile,
  TokenTemplate,
  TxBatch,
  TxRequest,
} from '@web3eco/core';

// ---------------------------------------------------------------------------
// Chain access
// ---------------------------------------------------------------------------

/**
 * Read-only chain access.
 *
 * Implementations are expected to prefer the user's own wallet RPC (EIP-1193) and fall back to a
 * public endpoint. That ordering is a cost decision as much as a decentralisation one: reads
 * served by the user's wallet cost the platform nothing, which is what keeps infrastructure
 * spend near zero as usage grows.
 */
export interface ChainReaderPort {
  readonly chain: Caip2;
  call(to: Address, data: Hex): Promise<Hex>;
  /** Batched reads, ideally through Multicall3 in one round trip. */
  multicall(calls: readonly { to: Address; data: Hex }[]): Promise<readonly Hex[]>;
  getBalance(address: Address): Promise<bigint>;
  getBlockTimestamp(): Promise<number>;
  getCode(address: Address): Promise<Hex>;
}

/** Submits a signed transaction. The only place a signature is ever produced is the user's wallet. */
export interface WalletPort {
  readonly chain: Caip2;
  getAddress(): Promise<Address>;
  sendTransaction(tx: TxRequest): Promise<`0x${string}`>;
  /** Submit a batch atomically via EIP-5792 where supported; otherwise sequentially. */
  sendBatch(batch: TxBatch): Promise<readonly `0x${string}`[]>;
  signTypedData(domain: unknown, types: unknown, message: unknown): Promise<Hex>;
  supportsBatching(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Deployment and launch
// ---------------------------------------------------------------------------

export interface TokenDeployOptions {
  readonly template: TokenTemplate;
  readonly name: string;
  readonly symbol: string;
  readonly supply: bigint;
  readonly recipient: Address;
  readonly salt: Hex;
  readonly admin?: Address;
  readonly cap?: bigint;
  readonly taxRecipient?: Address;
  readonly maxTaxBps?: number;
  readonly buyTaxBps?: number;
  readonly sellTaxBps?: number;
  readonly allowlistEnabled?: boolean;
}

export interface TokenFactoryPort {
  buildDeploy(chain: Caip2, options: TokenDeployOptions): Promise<TxRequest>;
  /** Address the token will land on, computed locally so the UI can show it before signing. */
  predictAddress(chain: Caip2, deployer: Address, options: TokenDeployOptions): Promise<Address>;
  readProfile(chain: Caip2, token: Address): Promise<TokenProfile>;
}

export interface PoolParams {
  readonly chain: Caip2;
  readonly token: Address;
  readonly tokenAmount: bigint;
  readonly nativeAmount: bigint;
  readonly dexId?: string;
  readonly deadline: number;
}

export interface LockParams {
  readonly chain: Caip2;
  readonly lpToken: Address;
  readonly amount: bigint;
  readonly unlockTime: number;
  readonly owner: Address;
}

export interface LiquidityPort {
  buildCreatePool(params: PoolParams): Promise<TxBatch>;
  buildLockLp(params: LockParams): Promise<TxBatch>;
  getPairAddress(chain: Caip2, token: Address, dexId?: string): Promise<Address | null>;
  readLockSummary(
    chain: Caip2,
    lpToken: Address,
  ): Promise<{ amount: bigint; latestUnlock: number }>;
}

export interface CurveLaunchOptions {
  readonly chain: Caip2;
  readonly name: string;
  readonly symbol: string;
  readonly salt: Hex;
  readonly devBuyValue: bigint;
  readonly devBuyMinTokensOut: bigint;
  readonly lockLpInsteadOfBurn: boolean;
  readonly lpLockDurationSeconds: number;
}

export interface BondingCurvePort {
  buildLaunch(options: CurveLaunchOptions): Promise<TxRequest>;
  buildBuy(
    chain: Caip2,
    curve: Address,
    nativeIn: bigint,
    minTokensOut: bigint,
    deadline: number,
  ): Promise<TxRequest>;
  buildSell(
    chain: Caip2,
    curve: Address,
    tokensIn: bigint,
    minNativeOut: bigint,
    deadline: number,
  ): Promise<TxBatch>;
  readCurve(chain: Caip2, curve: Address): Promise<CurveSnapshot>;
  predictCurveAddress(chain: Caip2, creator: Address, salt: Hex): Promise<Address>;
}

export interface LaunchpadPort {
  buildCreatePresale(params: unknown): Promise<TxBatch>;
  buildContribute(
    chain: Caip2,
    presale: Address,
    amount: bigint,
    proof: readonly Hex[],
  ): Promise<TxRequest>;
  buildClaim(chain: Caip2, presale: Address): Promise<TxRequest>;
  buildRefund(chain: Caip2, presale: Address): Promise<TxRequest>;
  buildFinalise(chain: Caip2, presale: Address): Promise<TxRequest>;
  readPresale(chain: Caip2, presale: Address): Promise<PresaleSnapshot>;
}

// ---------------------------------------------------------------------------
// Trading
// ---------------------------------------------------------------------------

export interface QuoteRequest {
  readonly chain: Caip2;
  readonly sellAsset: Caip19;
  readonly buyAsset: Caip19;
  readonly sellAmount: bigint;
  readonly taker: Address;
  readonly slippageBps: number;
}

/**
 * A swap route provider.
 *
 * Implementations MUST itemise every fee in the returned `Quote`, including the provider's own.
 * A routed swap really does stack an LP fee, the aggregator's fee and the integrator fee;
 * reporting one number understates what the user pays, and several front-ends have been caught
 * doing exactly that.
 */
export interface SwapRouterPort {
  readonly id: string;
  supports(chain: Caip2): boolean;
  quote(request: QuoteRequest): Promise<Quote>;
  buildSwap(request: QuoteRequest, quote: Quote): Promise<TxBatch>;
}

// ---------------------------------------------------------------------------
// NFT
// ---------------------------------------------------------------------------

export interface NftPort {
  buildDeployCollection(params: unknown): Promise<TxRequest>;
  buildMint(
    chain: Caip2,
    collection: Address,
    phaseId: number,
    quantity: bigint,
    proof: readonly Hex[],
  ): Promise<TxRequest>;
  readCollection(chain: Caip2, collection: Address): Promise<unknown>;
}

export interface MarketplacePort {
  /** Returns the EIP-712 payload for the user's wallet to sign. Never signs it here. */
  buildListingSignRequest(order: unknown): Promise<{ domain: unknown; types: unknown; message: unknown }>;
  buildFulfill(chain: Caip2, order: unknown, signature: Hex): Promise<TxBatch>;
  /** Publish a signed order to wherever orders live: IPFS, edge KV, or an external marketplace. */
  relay(order: unknown, signature: Hex): Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Supporting services
// ---------------------------------------------------------------------------

export interface StoragePort {
  pinJson(value: unknown): Promise<{ cid: string; uri: string }>;
  pinFile(file: Blob, filename: string): Promise<{ cid: string; uri: string }>;
  /** Resolve an ipfs:// or ar:// URI to something a browser can fetch. */
  resolveUri(uri: string): string;
}

export interface PricingPort {
  usdPrice(asset: Caip19): Promise<number | null>;
  usdPrices(assets: readonly Caip19[]): Promise<ReadonlyMap<Caip19, number>>;
}

/**
 * Third-party token risk scanning, layered on top of the on-chain `riskFlags` the contracts
 * publish. Treated as advisory: a scanner being unreachable must degrade to "unknown", never to
 * "safe", because a silent failure that reads as an all-clear is worse than no check at all.
 */
export interface RiskScannerPort {
  readonly id: string;
  scan(asset: Caip19): Promise<RiskReport>;
}

/**
 * Transaction simulation before signing.
 *
 * This is the single most effective defence against the Bybit/Safe class of attack, where the
 * contract was sound and the compromised front-end simply asked the user to sign something other
 * than what was on screen. Simulating and showing the real balance changes means a swapped
 * payload is visible before the signature, not after the funds are gone.
 */
export interface SimulationPort {
  simulate(tx: TxRequest, from: Address): Promise<SimulationResult>;
  simulateBatch(batch: TxBatch, from: Address): Promise<readonly SimulationResult[]>;
}

export interface ChartDataPort {
  ohlc(asset: Caip19, timeframe: Timeframe, limit: number): Promise<readonly Candle[]>;
}

export interface VerificationPort {
  /** Submit source for block-explorer verification. */
  verify(chain: Caip2, address: Address, source: unknown): Promise<{ guid: string }>;
  checkStatus(chain: Caip2, guid: string): Promise<'pending' | 'verified' | 'failed'>;
  isVerified(chain: Caip2, address: Address): Promise<boolean>;
}

export interface FeePort {
  config(chain: Caip2, product: Product): Promise<FeeConfig>;
  /** Ceiling compiled into the contract. Reported so the UI can state what the fee can never exceed. */
  hardCapBps(product: Product): number;
}

/**
 * Jurisdiction gating.
 *
 * Present as a port because the blueprint's legal analysis is unambiguous that the higher-risk
 * products need geographic restrictions, and because where that line falls will move as the FIU-IND,
 * MiCA and US positions develop. Keeping it behind an interface means a change of legal advice is
 * a config change rather than a rewrite.
 */
export interface ComplianceGatePort {
  check(context: {
    readonly product: Product;
    readonly countryCode?: string;
    readonly address?: Address;
  }): Promise<{ allowed: boolean; reason: string | null }>;
}

export interface IndexerPort {
  logs(
    chain: Caip2,
    from: bigint,
    to: bigint,
    filter: { address?: Address; topics?: readonly Hex[] },
  ): Promise<readonly unknown[]>;
}
