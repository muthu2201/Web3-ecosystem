/**
 * Liquidity locks.
 *
 * The locker has no owner, no pause and no emergency path. That is the whole point: a lock is
 * only a promise if nobody can take the tokens out early, including the platform. Everything
 * here is therefore a read or an action by the lock's own owner.
 */

import { getChain, getDeployment } from '@web3eco/chain-registry';
import type { Address, Caip2, TxBatch, TxRequest } from '@web3eco/core';
import type { ChainReaderPort } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { LiquidityLockerAbi, StandardTokenAbi } from './generated/index.js';
import { SdkError } from './reader.js';

export interface LockRecord {
  readonly chain: Caip2;
  readonly lockId: bigint;
  readonly token: Address;
  readonly owner: Address;
  readonly amount: bigint;
  readonly unlockTime: number;
  readonly lockedAt: number;
  readonly unlocked: boolean;
}

export class LockOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockOptionsError';
  }
}

export class LiquidityLockerAdapter {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  /**
   * Lock tokens: an exact-amount approval followed by the lock itself.
   *
   * Exact rather than unlimited, for the same reason as everywhere else — a standing allowance
   * to any contract is a risk that outlives the action it was granted for.
   */
  async buildLock(
    chain: Caip2,
    token: Address,
    amount: bigint,
    unlockTime: number,
    owner: Address,
  ): Promise<TxBatch> {
    if (amount <= 0n) throw new LockOptionsError('amount must be positive');
    const reader = this.readerFor(chain);
    const now = await reader.getBlockTimestamp();
    if (unlockTime <= now) throw new LockOptionsError('the unlock time must be in the future');

    const { liquidityLocker } = getDeployment(chain);

    const approve: TxRequest = {
      chain,
      to: token,
      data: encodeFunctionData({
        abi: StandardTokenAbi,
        functionName: 'approve',
        args: [liquidityLocker, amount],
      }),
      value: 0n,
      summary: 'Approve the locker to take exactly the tokens being locked',
    };

    const lock: TxRequest = {
      chain,
      to: liquidityLocker,
      data: encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'lock',
        args: [token, amount, BigInt(unlockTime), owner],
      }),
      value: 0n,
      summary: `Lock until ${new Date(unlockTime * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    };

    return {
      chain,
      calls: [approve, lock],
      summary: `Lock tokens on ${getChain(chain).name}`,
      requiresAtomicity: false,
    };
  }

  async buildWithdraw(
    chain: Caip2,
    lockId: bigint,
    amount: bigint,
    to: Address,
  ): Promise<TxRequest> {
    if (amount <= 0n) throw new LockOptionsError('amount must be positive');
    const { liquidityLocker } = getDeployment(chain);
    return {
      chain,
      to: liquidityLocker,
      data: encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'withdraw',
        args: [lockId, amount, to],
      }),
      value: 0n,
      summary: `Withdraw from lock #${lockId}`,
    };
  }

  /** Extending is one-way: the contract rejects any new unlock time earlier than the current one. */
  async buildExtend(chain: Caip2, lockId: bigint, newUnlockTime: number): Promise<TxRequest> {
    const { liquidityLocker } = getDeployment(chain);
    return {
      chain,
      to: liquidityLocker,
      data: encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'extend',
        args: [lockId, BigInt(newUnlockTime)],
      }),
      value: 0n,
      summary: `Extend lock #${lockId}`,
    };
  }

  async buildTopUp(
    chain: Caip2,
    lockId: bigint,
    token: Address,
    amount: bigint,
  ): Promise<TxBatch> {
    if (amount <= 0n) throw new LockOptionsError('amount must be positive');
    const { liquidityLocker } = getDeployment(chain);
    return {
      chain,
      calls: [
        {
          chain,
          to: token,
          data: encodeFunctionData({
            abi: StandardTokenAbi,
            functionName: 'approve',
            args: [liquidityLocker, amount],
          }),
          value: 0n,
          summary: 'Approve the locker for exactly the added amount',
        },
        {
          chain,
          to: liquidityLocker,
          data: encodeFunctionData({
            abi: LiquidityLockerAbi,
            functionName: 'topUp',
            args: [lockId, amount],
          }),
          value: 0n,
          summary: `Add to lock #${lockId}`,
        },
      ],
      summary: `Top up lock #${lockId}`,
      requiresAtomicity: false,
    };
  }

  async readLock(chain: Caip2, lockId: bigint): Promise<LockRecord> {
    const reader = this.readerFor(chain);
    const { liquidityLocker } = getDeployment(chain);

    const [lockRaw, unlockedRaw] = await reader.multicall([
      {
        to: liquidityLocker,
        data: encodeFunctionData({
          abi: LiquidityLockerAbi,
          functionName: 'getLock',
          args: [lockId],
        }),
      },
      {
        to: liquidityLocker,
        data: encodeFunctionData({
          abi: LiquidityLockerAbi,
          functionName: 'isUnlocked',
          args: [lockId],
        }),
      },
    ]);

    if (!lockRaw || lockRaw === '0x') throw new SdkError(`lock #${lockId} does not exist`);

    const [l] = decodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'token', type: 'address' },
            { name: 'owner', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'unlockTime', type: 'uint64' },
            { name: 'lockedAt', type: 'uint64' },
          ],
        },
      ] as const,
      lockRaw,
    );

    return {
      chain,
      lockId,
      token: l.token,
      owner: l.owner,
      amount: l.amount,
      unlockTime: Number(l.unlockTime),
      lockedAt: Number(l.lockedAt),
      unlocked:
        !unlockedRaw || unlockedRaw === '0x'
          ? false
          : decodeAbiParameters(parseAbiParameters('bool'), unlockedRaw)[0],
    };
  }

  async lockIdsOfOwner(chain: Caip2, owner: Address): Promise<readonly bigint[]> {
    const reader = this.readerFor(chain);
    const { liquidityLocker } = getDeployment(chain);
    const raw = await reader.call(
      liquidityLocker,
      encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'lockIdsOfOwner',
        args: [owner],
      }),
    );
    if (raw === '0x') return [];
    return decodeAbiParameters(parseAbiParameters('uint256[]'), raw)[0];
  }

  async lockIdsOfToken(chain: Caip2, token: Address): Promise<readonly bigint[]> {
    const reader = this.readerFor(chain);
    const { liquidityLocker } = getDeployment(chain);
    const raw = await reader.call(
      liquidityLocker,
      encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'lockIdsOfToken',
        args: [token],
      }),
    );
    if (raw === '0x') return [];
    return decodeAbiParameters(parseAbiParameters('uint256[]'), raw)[0];
  }

  async readLocks(chain: Caip2, ids: readonly bigint[]): Promise<LockRecord[]> {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.readLock(chain, id);
        } catch {
          return null;
        }
      }),
    );
    return results.filter((l): l is LockRecord => l !== null);
  }

  /** Total locked for a token and the latest unlock across all of its locks. */
  async lockSummary(
    chain: Caip2,
    token: Address,
  ): Promise<{ amount: bigint; latestUnlock: number }> {
    const reader = this.readerFor(chain);
    const { liquidityLocker } = getDeployment(chain);
    const raw = await reader.call(
      liquidityLocker,
      encodeFunctionData({
        abi: LiquidityLockerAbi,
        functionName: 'lockSummary',
        args: [token],
      }),
    );
    if (raw === '0x') return { amount: 0n, latestUnlock: 0 };
    const [amount, latestUnlock] = decodeAbiParameters(
      parseAbiParameters('uint256, uint64'),
      raw,
    );
    return { amount, latestUnlock: Number(latestUnlock) };
  }
}
