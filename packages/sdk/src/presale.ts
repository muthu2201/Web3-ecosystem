/**
 * Presales and fair launches.
 *
 * Creation is a two-call batch: an ERC-20 approval for exactly the tokens the sale needs, then
 * the factory call that deploys, funds and opens the sale atomically. The approval is exact
 * rather than unlimited — an infinite allowance to a factory is a standing risk with no
 * corresponding benefit for a one-off action.
 */

import { getChain, getDeployment } from '@web3eco/chain-registry';
import type {
  Address,
  Caip2,
  Hex,
  PresaleSnapshot,
  PresaleState,
  TxBatch,
  TxRequest,
} from '@web3eco/core';
import type { ChainReaderPort, LaunchpadPort } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { PresaleAbi, PresaleFactoryAbi, StandardTokenAbi } from './generated/index.js';
import { SdkError } from './reader.js';

/** Contract constants, mirrored so the UI can reject a bad configuration before it costs gas. */
export const PRESALE_LIMITS = {
  /** At least half the raise must reach the pool. Below this is the shape every exit scam takes. */
  MIN_LIQUIDITY_BPS: 5_000,
  MIN_DURATION_SECONDS: 60 * 60,
  MAX_DURATION_SECONDS: 90 * 24 * 60 * 60,
  MIN_LP_LOCK_SECONDS: 30 * 24 * 60 * 60,
} as const;

const STATE_FROM_ORDINAL: readonly PresaleState[] = [
  'pending',
  'live',
  'awaitingFinalisation',
  'succeeded',
  'failed',
];

export interface PresaleCreateOptions {
  readonly chain: Caip2;
  readonly token: Address;
  /** Sale rate, tokens per 1e18 of native currency. */
  readonly tokensPerNative: bigint;
  /** Pool rate. Must not exceed the sale rate, or the first seller dumps below what buyers paid. */
  readonly liquidityTokensPerNative: bigint;
  readonly softCap: bigint;
  readonly hardCap: bigint;
  readonly minContribution: bigint;
  readonly maxContribution: bigint;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly liquidityBps: number;
  readonly lockLpInsteadOfBurn: boolean;
  readonly lpLockDurationSeconds: number;
  /** Zero hash for a public sale. */
  readonly whitelistRoot: Hex;
  readonly isFairLaunch: boolean;
  readonly salt: Hex;
}

export class PresaleOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PresaleOptionsError';
  }
}

/**
 * Reject what the contract would reject anyway.
 *
 * The contract enforces every one of these; checking here is purely so the user finds out before
 * paying gas for a transaction that cannot succeed.
 */
export function validatePresaleOptions(o: PresaleCreateOptions, chainNow: number): void {
  const fail = (m: string): never => {
    throw new PresaleOptionsError(m);
  };
  if (o.tokensPerNative <= 0n || o.liquidityTokensPerNative <= 0n) fail('rates must be positive');
  if (o.softCap <= 0n) fail('soft cap must be positive');
  if (o.hardCap < o.softCap) fail('hard cap must be at least the soft cap');
  if (o.minContribution <= 0n) fail('minimum contribution must be positive');
  if (o.maxContribution < o.minContribution) fail('maximum contribution is below the minimum');
  if (o.startsAt < chainNow) fail('the sale cannot start in the past');
  const duration = o.endsAt - o.startsAt;
  if (duration <= PRESALE_LIMITS.MIN_DURATION_SECONDS) fail('the sale must run for over an hour');
  if (duration > PRESALE_LIMITS.MAX_DURATION_SECONDS) fail('the sale may not run beyond 90 days');
  if (o.liquidityBps < PRESALE_LIMITS.MIN_LIQUIDITY_BPS || o.liquidityBps > 10_000) {
    fail('at least 50% of the raise must go to liquidity');
  }
  if (o.lockLpInsteadOfBurn && o.lpLockDurationSeconds < PRESALE_LIMITS.MIN_LP_LOCK_SECONDS) {
    fail('an LP lock must run for at least 30 days');
  }
  if (o.liquidityTokensPerNative > o.tokensPerNative) {
    fail('the pool rate must not exceed the sale rate');
  }
}

/**
 * Tokens the sale must be funded with, computed exactly as the contract does.
 *
 * The division-before-multiplication is deliberate and load-bearing: `_tokensNeeded` and
 * `_seedPool` in the contract truncate at the same two points, and reproducing that here is what
 * makes the figure shown to the creator match the approval the factory will actually pull.
 */
export function tokensNeededFor(o: PresaleCreateOptions): bigint {
  const forBuyers = (o.hardCap * o.tokensPerNative) / 10n ** 18n;
  const nativeToPool = (o.hardCap * BigInt(o.liquidityBps)) / 10_000n;
  const forPool = (nativeToPool * o.liquidityTokensPerNative) / 10n ** 18n;
  return forBuyers + forPool;
}

function toParamsTuple(o: PresaleCreateOptions) {
  return {
    token: o.token,
    // Overwritten by the factory with msg.sender, so a sale cannot be created on someone else's
    // behalf and pointed at an attacker's payout address. Sent as zero to make that explicit.
    owner: '0x0000000000000000000000000000000000000000' as Address,
    tokensPerNative: o.tokensPerNative,
    liquidityTokensPerNative: o.liquidityTokensPerNative,
    softCap: o.softCap,
    hardCap: o.hardCap,
    minContribution: o.minContribution,
    maxContribution: o.maxContribution,
    startsAt: BigInt(o.startsAt),
    endsAt: BigInt(o.endsAt),
    liquidityBps: o.liquidityBps,
    lockLpInsteadOfBurn: o.lockLpInsteadOfBurn,
    lpLockDuration: BigInt(o.lpLockDurationSeconds),
    whitelistRoot: o.whitelistRoot,
    isFairLaunch: o.isFairLaunch,
  } as const;
}

export class PresaleAdapter implements LaunchpadPort {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  async buildCreatePresale(params: unknown): Promise<TxBatch> {
    const o = params as PresaleCreateOptions;
    const reader = this.readerFor(o.chain);
    validatePresaleOptions(o, await reader.getBlockTimestamp());

    const { presaleFactory } = getDeployment(o.chain);
    const needed = tokensNeededFor(o);

    const approve: TxRequest = {
      chain: o.chain,
      to: o.token,
      data: encodeFunctionData({
        abi: StandardTokenAbi,
        functionName: 'approve',
        args: [presaleFactory, needed],
      }),
      value: 0n,
      summary: 'Approve the factory to take exactly the tokens this sale needs',
    };

    const create: TxRequest = {
      chain: o.chain,
      to: presaleFactory,
      data: encodeFunctionData({
        abi: PresaleFactoryAbi,
        functionName: 'createPresale',
        args: [toParamsTuple(o), o.salt],
      }),
      value: 0n,
      summary: `Create ${o.isFairLaunch ? 'a fair launch' : 'a presale'} on ${getChain(o.chain).name}`,
    };

    return {
      chain: o.chain,
      calls: [approve, create],
      summary: 'Fund and open the sale',
      // A stranded exact-amount approval is harmless, and requiring atomicity would exclude
      // every wallet without EIP-5792.
      requiresAtomicity: false,
    };
  }

  async buildContribute(
    chain: Caip2,
    presale: Address,
    amount: bigint,
    proof: readonly Hex[],
  ): Promise<TxRequest> {
    if (amount <= 0n) throw new PresaleOptionsError('contribution must be positive');
    return {
      chain,
      to: presale,
      data: encodeFunctionData({
        abi: PresaleAbi,
        functionName: 'contribute',
        args: [proof as readonly Hex[]],
      }),
      value: amount,
      summary: `Contribute to the sale on ${getChain(chain).name}`,
    };
  }

  async buildClaim(chain: Caip2, presale: Address): Promise<TxRequest> {
    return {
      chain,
      to: presale,
      data: encodeFunctionData({ abi: PresaleAbi, functionName: 'claim' }),
      value: 0n,
      summary: 'Claim your tokens from the finalised sale',
    };
  }

  async buildRefund(chain: Caip2, presale: Address): Promise<TxRequest> {
    return {
      chain,
      to: presale,
      data: encodeFunctionData({ abi: PresaleAbi, functionName: 'refund' }),
      value: 0n,
      summary: 'Refund your contribution in full',
    };
  }

  async buildFinalise(chain: Caip2, presale: Address): Promise<TxRequest> {
    return {
      chain,
      to: presale,
      data: encodeFunctionData({ abi: PresaleAbi, functionName: 'finalise' }),
      value: 0n,
      summary: 'Finalise the sale: seed the pool and open claims',
    };
  }

  async buildCancel(chain: Caip2, presale: Address): Promise<TxRequest> {
    return {
      chain,
      to: presale,
      data: encodeFunctionData({ abi: PresaleAbi, functionName: 'cancel' }),
      value: 0n,
      summary: 'Cancel the sale and open refunds',
    };
  }

  /** Read a sale's full public state in one batched round trip. */
  async readPresale(chain: Caip2, presale: Address): Promise<PresaleSnapshot> {
    const reader = this.readerFor(chain);
    const FIELDS = [
      'token',
      'owner',
      'state',
      'softCap',
      'hardCap',
      'totalRaised',
      'minContribution',
      'maxContribution',
      'tokensPerNative',
      'liquidityTokensPerNative',
      'liquidityBps',
      'startsAt',
      'endsAt',
      'isFairLaunch',
      'whitelistRoot',
    ] as const;

    const results = await reader.multicall(
      FIELDS.map((functionName) => ({
        to: presale,
        data: encodeFunctionData({ abi: PresaleAbi, functionName }),
      })),
    );

    const at = (i: number): Hex => {
      const raw = results[i];
      if (!raw || raw === '0x') throw new SdkError(`presale ${presale} returned no data`);
      return raw;
    };
    const addr = (i: number): Address =>
      decodeAbiParameters(parseAbiParameters('address'), at(i))[0];
    const num = (i: number): bigint => decodeAbiParameters(parseAbiParameters('uint256'), at(i))[0];

    const stateOrdinal = Number(
      decodeAbiParameters(parseAbiParameters('uint8'), at(2))[0],
    );
    const state = STATE_FROM_ORDINAL[stateOrdinal];
    if (!state) throw new SdkError(`presale ${presale} reported unknown state ${stateOrdinal}`);

    const root = decodeAbiParameters(parseAbiParameters('bytes32'), at(14))[0];

    return {
      chain,
      presale,
      token: addr(0),
      owner: addr(1),
      state,
      softCap: num(3),
      hardCap: num(4),
      totalRaised: num(5),
      minContribution: num(6),
      maxContribution: num(7),
      tokensPerNative: num(8),
      liquidityTokensPerNative: num(9),
      liquidityBps: BigInt(decodeAbiParameters(parseAbiParameters('uint16'), at(10))[0]),
      startsAt: Number(decodeAbiParameters(parseAbiParameters('uint64'), at(11))[0]),
      endsAt: Number(decodeAbiParameters(parseAbiParameters('uint64'), at(12))[0]),
      isFairLaunch: decodeAbiParameters(parseAbiParameters('bool'), at(13))[0],
      whitelisted: root !== `0x${'0'.repeat(64)}`,
    };
  }

  /** Per-account position in a sale: contributed, owed, and whether it has already been taken. */
  async readPosition(
    chain: Caip2,
    presale: Address,
    account: Address,
  ): Promise<{
    contribution: bigint;
    allocation: bigint;
    hasClaimed: boolean;
    hasRefunded: boolean;
  }> {
    const reader = this.readerFor(chain);
    const [contribRaw, allocRaw, claimedRaw, refundedRaw] = await reader.multicall([
      {
        to: presale,
        data: encodeFunctionData({
          abi: PresaleAbi,
          functionName: 'contributionOf',
          args: [account],
        }),
      },
      {
        to: presale,
        data: encodeFunctionData({
          abi: PresaleAbi,
          functionName: 'allocationOf',
          args: [account],
        }),
      },
      {
        to: presale,
        data: encodeFunctionData({ abi: PresaleAbi, functionName: 'hasClaimed', args: [account] }),
      },
      {
        to: presale,
        data: encodeFunctionData({ abi: PresaleAbi, functionName: 'hasRefunded', args: [account] }),
      },
    ]);

    const u256 = (raw: Hex | undefined): bigint =>
      !raw || raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
    const flag = (raw: Hex | undefined): boolean =>
      !raw || raw === '0x' ? false : decodeAbiParameters(parseAbiParameters('bool'), raw)[0];

    return {
      contribution: u256(contribRaw),
      allocation: u256(allocRaw),
      hasClaimed: flag(claimedRaw),
      hasRefunded: flag(refundedRaw),
    };
  }

  async totalPresales(chain: Caip2): Promise<number> {
    const reader = this.readerFor(chain);
    const { presaleFactory } = getDeployment(chain);
    const raw = await reader.call(
      presaleFactory,
      encodeFunctionData({ abi: PresaleFactoryAbi, functionName: 'totalPresales' }),
    );
    return raw === '0x' ? 0 : Number(decodeAbiParameters(parseAbiParameters('uint256'), raw)[0]);
  }

  /** Paginated on chain: an unbounded list grows with every sale and eventually breaks the page. */
  async listPresales(chain: Caip2, offset: number, limit: number): Promise<readonly Address[]> {
    const reader = this.readerFor(chain);
    const { presaleFactory } = getDeployment(chain);
    const raw = await reader.call(
      presaleFactory,
      encodeFunctionData({
        abi: PresaleFactoryAbi,
        functionName: 'presalesPaged',
        args: [BigInt(offset), BigInt(limit)],
      }),
    );
    if (raw === '0x') return [];
    return decodeAbiParameters(parseAbiParameters('address[]'), raw)[0];
  }

  async readPresales(chain: Caip2, presales: readonly Address[]): Promise<PresaleSnapshot[]> {
    const results = await Promise.all(
      presales.map(async (p) => {
        try {
          return await this.readPresale(chain, p);
        } catch {
          // One unreadable sale must not blank the whole listing.
          return null;
        }
      }),
    );
    return results.filter((s): s is PresaleSnapshot => s !== null);
  }

  /** Whether the factory on `chain` created this sale. Clones cannot appear in a static manifest. */
  async isPlatformPresale(chain: Caip2, presale: Address): Promise<boolean> {
    const reader = this.readerFor(chain);
    const { presaleFactory } = getDeployment(chain);
    const raw = await reader.call(
      presaleFactory,
      encodeFunctionData({
        abi: PresaleFactoryAbi,
        functionName: 'isPresale',
        args: [presale],
      }),
    );
    return raw === '0x' ? false : decodeAbiParameters(parseAbiParameters('bool'), raw)[0];
  }

  async predictPresaleAddress(chain: Caip2, creator: Address, salt: Hex): Promise<Address> {
    const reader = this.readerFor(chain);
    const { presaleFactory } = getDeployment(chain);
    const raw = await reader.call(
      presaleFactory,
      encodeFunctionData({
        abi: PresaleFactoryAbi,
        functionName: 'predictPresaleAddress',
        args: [creator, salt],
      }),
    );
    if (raw === '0x') throw new SdkError('factory returned no address');
    return decodeAbiParameters(parseAbiParameters('address'), raw)[0];
  }
}
