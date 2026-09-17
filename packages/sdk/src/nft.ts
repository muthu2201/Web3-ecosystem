/**
 * NFT collections: deployment, phase configuration and minting.
 *
 * Collections are full CREATE2 deploys rather than clones, so a collection's address can be
 * predicted before it exists and its code is its own — a proxy pointing at shared logic would
 * let whoever controls that logic change every collection at once.
 */

import { getChain, getDeployment } from '@web3eco/chain-registry';
import type { Address, Caip2, Hex, TxRequest } from '@web3eco/core';
import type { ChainReaderPort, NftPort } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { NftCollectionAbi, NftFactoryAbi } from './generated/index.js';
import { SdkError } from './reader.js';

/** Royalty ceiling the collection enforces in bytecode. No owner can exceed it. */
export const MAX_ROYALTY_BPS = 1_000;

export interface CollectionDeployOptions {
  readonly chain: Caip2;
  readonly name: string;
  readonly symbol: string;
  /** Token metadata prefix. `tokenURI(id)` resolves to `${baseURI}${id}`. */
  readonly baseURI: string;
  /** Collection-level metadata, read by marketplaces. */
  readonly contractURI: string;
  readonly maxSupply: bigint;
  readonly owner: Address;
  readonly royaltyReceiver: Address;
  readonly royaltyBps: number;
  readonly salt: Hex;
}

export interface MintPhase {
  /** Zero for a public phase; otherwise an allowlist root over double-hashed leaves. */
  readonly merkleRoot: Hex;
  readonly price: bigint;
  readonly startsAt: number;
  readonly endsAt: number;
  /** Zero means no per-wallet limit. */
  readonly maxPerWallet: number;
  /** Zero means the phase is bounded only by the collection's max supply. */
  readonly maxSupply: number;
}

export interface CollectionSnapshot {
  readonly chain: Caip2;
  readonly collection: Address;
  readonly name: string;
  readonly symbol: string;
  readonly maxSupply: bigint;
  readonly totalMinted: bigint;
  readonly owner: Address;
  readonly contractURI: string;
  readonly metadataFrozen: boolean;
  readonly phaseCount: number;
  /** Native currency the collection is holding for its owner to withdraw. */
  readonly proceeds: bigint;
  readonly isPlatformCollection: boolean;
}

export class NftOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NftOptionsError';
  }
}

export class NftAdapter implements NftPort {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  async buildDeployCollection(params: unknown): Promise<TxRequest> {
    const o = params as CollectionDeployOptions;
    if (o.name.trim() === '') throw new NftOptionsError('name must not be empty');
    if (o.symbol.trim() === '') throw new NftOptionsError('symbol must not be empty');
    if (o.maxSupply <= 0n) throw new NftOptionsError('max supply must be positive');
    if (o.royaltyBps > MAX_ROYALTY_BPS) {
      throw new NftOptionsError(
        `royalty of ${o.royaltyBps} bps exceeds the contract ceiling of ${MAX_ROYALTY_BPS} (10%)`,
      );
    }

    const { nftFactory } = getDeployment(o.chain);
    const fee = await this.readDeployFee(o.chain);

    return {
      chain: o.chain,
      to: nftFactory,
      data: encodeFunctionData({
        abi: NftFactoryAbi,
        functionName: 'deployCollection',
        args: [
          {
            name: o.name,
            symbol: o.symbol,
            baseURI: o.baseURI,
            contractURI: o.contractURI,
            maxSupply: o.maxSupply,
            owner: o.owner,
            royaltyReceiver: o.royaltyReceiver,
            royaltyBps: BigInt(o.royaltyBps),
            salt: o.salt,
          },
        ],
      }),
      value: fee,
      summary: `Deploy the ${o.symbol} NFT collection on ${getChain(o.chain).name}`,
    };
  }

  /**
   * Mint from a phase.
   *
   * `value` must equal `price * quantity` exactly — the collection rejects both underpayment and
   * overpayment rather than silently keeping the difference. The platform fee comes out of the
   * collection's proceeds, not out of what the minter sends, so the price shown is the price paid.
   */
  async buildMint(
    chain: Caip2,
    collection: Address,
    phaseId: number,
    quantity: bigint,
    proof: readonly Hex[],
  ): Promise<TxRequest> {
    if (quantity <= 0n) throw new NftOptionsError('quantity must be positive');
    const phase = await this.readPhase(chain, collection, phaseId);
    return {
      chain,
      to: collection,
      data: encodeFunctionData({
        abi: NftCollectionAbi,
        functionName: 'mint',
        args: [BigInt(phaseId), quantity, proof as readonly Hex[]],
      }),
      value: phase.price * quantity,
      summary: `Mint ${quantity} from phase ${phaseId}`,
    };
  }

  async buildAddPhase(chain: Caip2, collection: Address, phase: MintPhase): Promise<TxRequest> {
    if (phase.endsAt <= phase.startsAt) throw new NftOptionsError('the phase must end after it starts');
    return {
      chain,
      to: collection,
      data: encodeFunctionData({
        abi: NftCollectionAbi,
        functionName: 'addPhase',
        args: [
          {
            merkleRoot: phase.merkleRoot,
            price: phase.price,
            startsAt: BigInt(phase.startsAt),
            endsAt: BigInt(phase.endsAt),
            maxPerWallet: phase.maxPerWallet,
            maxSupply: phase.maxSupply,
          },
        ],
      }),
      value: 0n,
      summary: 'Add a mint phase',
    };
  }

  async buildWithdrawProceeds(
    chain: Caip2,
    collection: Address,
    to: Address,
  ): Promise<TxRequest> {
    return {
      chain,
      to: collection,
      data: encodeFunctionData({
        abi: NftCollectionAbi,
        functionName: 'withdrawProceeds',
        args: [to],
      }),
      value: 0n,
      summary: 'Withdraw mint proceeds',
    };
  }

  /**
   * Freeze metadata permanently.
   *
   * Irreversible by design: a collection whose base URI can still be changed is a collection
   * whose art can be swapped after sale, and buyers deserve to be able to verify that it cannot.
   */
  async buildFreezeMetadata(chain: Caip2, collection: Address): Promise<TxRequest> {
    return {
      chain,
      to: collection,
      data: encodeFunctionData({ abi: NftCollectionAbi, functionName: 'freezeMetadata' }),
      value: 0n,
      summary: 'Permanently freeze this collection’s metadata',
    };
  }

  async readCollection(chain: Caip2, collection: Address): Promise<CollectionSnapshot> {
    const reader = this.readerFor(chain);
    const { nftFactory } = getDeployment(chain);

    const FIELDS = [
      'name',
      'symbol',
      'maxSupply',
      'totalMinted',
      'owner',
      'contractURI',
      'metadataFrozen',
      'phaseCount',
      'proceeds',
    ] as const;

    const results = await reader.multicall([
      ...FIELDS.map((functionName) => ({
        to: collection,
        data: encodeFunctionData({ abi: NftCollectionAbi, functionName }),
      })),
      {
        to: nftFactory,
        data: encodeFunctionData({
          abi: NftFactoryAbi,
          functionName: 'isPlatformCollection',
          args: [collection],
        }),
      },
    ]);

    const at = (i: number): Hex => {
      const raw = results[i];
      if (!raw || raw === '0x') throw new SdkError(`collection ${collection} returned no data`);
      return raw;
    };
    const str = (i: number): string => {
      const raw = results[i];
      if (!raw || raw === '0x') return '';
      try {
        return decodeAbiParameters(parseAbiParameters('string'), raw)[0];
      } catch {
        return '';
      }
    };
    const num = (i: number): bigint => decodeAbiParameters(parseAbiParameters('uint256'), at(i))[0];

    return {
      chain,
      collection,
      name: str(0),
      symbol: str(1),
      maxSupply: num(2),
      totalMinted: num(3),
      owner: decodeAbiParameters(parseAbiParameters('address'), at(4))[0],
      contractURI: str(5),
      metadataFrozen: decodeAbiParameters(parseAbiParameters('bool'), at(6))[0],
      phaseCount: Number(num(7)),
      proceeds: num(8),
      isPlatformCollection: decodeAbiParameters(parseAbiParameters('bool'), at(9))[0],
    };
  }

  async readPhase(chain: Caip2, collection: Address, phaseId: number): Promise<MintPhase> {
    const reader = this.readerFor(chain);
    const raw = await reader.call(
      collection,
      encodeFunctionData({
        abi: NftCollectionAbi,
        functionName: 'getPhase',
        args: [BigInt(phaseId)],
      }),
    );
    if (raw === '0x') throw new SdkError(`collection ${collection} has no phase ${phaseId}`);
    const [p] = decodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'merkleRoot', type: 'bytes32' },
            { name: 'price', type: 'uint256' },
            { name: 'startsAt', type: 'uint64' },
            { name: 'endsAt', type: 'uint64' },
            { name: 'maxPerWallet', type: 'uint32' },
            { name: 'maxSupply', type: 'uint32' },
          ],
        },
      ] as const,
      raw,
    );
    return {
      merkleRoot: p.merkleRoot,
      price: p.price,
      startsAt: Number(p.startsAt),
      endsAt: Number(p.endsAt),
      maxPerWallet: Number(p.maxPerWallet),
      maxSupply: Number(p.maxSupply),
    };
  }

  async readPhases(chain: Caip2, collection: Address, count: number): Promise<MintPhase[]> {
    const phases: MintPhase[] = [];
    for (let i = 0; i < count; i += 1) {
      phases.push(await this.readPhase(chain, collection, i));
    }
    return phases;
  }

  /** How many of a phase `minter` has already taken, for the per-wallet limit. */
  async mintedInPhase(
    chain: Caip2,
    collection: Address,
    phaseId: number,
    minter: Address,
  ): Promise<bigint> {
    const reader = this.readerFor(chain);
    const raw = await reader.call(
      collection,
      encodeFunctionData({
        abi: NftCollectionAbi,
        functionName: 'mintedInPhase',
        args: [BigInt(phaseId), minter],
      }),
    );
    return raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  }

  async totalCollections(chain: Caip2): Promise<number> {
    const reader = this.readerFor(chain);
    const { nftFactory } = getDeployment(chain);
    const raw = await reader.call(
      nftFactory,
      encodeFunctionData({ abi: NftFactoryAbi, functionName: 'totalCollections' }),
    );
    return raw === '0x' ? 0 : Number(decodeAbiParameters(parseAbiParameters('uint256'), raw)[0]);
  }

  async listCollections(chain: Caip2, offset: number, limit: number): Promise<readonly Address[]> {
    const reader = this.readerFor(chain);
    const { nftFactory } = getDeployment(chain);
    const raw = await reader.call(
      nftFactory,
      encodeFunctionData({
        abi: NftFactoryAbi,
        functionName: 'collectionsPaged',
        args: [BigInt(offset), BigInt(limit)],
      }),
    );
    if (raw === '0x') return [];
    return decodeAbiParameters(parseAbiParameters('address[]'), raw)[0];
  }

  async readCollections(
    chain: Caip2,
    collections: readonly Address[],
  ): Promise<CollectionSnapshot[]> {
    const results = await Promise.all(
      collections.map(async (c) => {
        try {
          return await this.readCollection(chain, c);
        } catch {
          return null;
        }
      }),
    );
    return results.filter((s): s is CollectionSnapshot => s !== null);
  }

  async readDeployFee(chain: Caip2): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const raw = await reader.call(
      feeRouter,
      encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'flatNativeOf',
            stateMutability: 'view',
            inputs: [{ name: 'product', type: 'uint8' }],
            outputs: [{ type: 'uint256' }],
          },
        ] as const,
        functionName: 'flatNativeOf',
        args: [6], // Product.NftDeploy
      }),
    );
    return raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  }

  /** Where a collection will land, computed from the factory's own salt derivation. */
  async predictCollectionAddress(
    chain: Caip2,
    deployer: Address,
    salt: Hex,
    initCodeHash: Hex,
  ): Promise<Address> {
    const reader = this.readerFor(chain);
    const { nftFactory } = getDeployment(chain);
    const raw = await reader.call(
      nftFactory,
      encodeFunctionData({
        abi: NftFactoryAbi,
        functionName: 'computeAddress',
        args: [deployer, salt, initCodeHash],
      }),
    );
    if (raw === '0x') throw new SdkError('factory returned no address');
    return decodeAbiParameters(parseAbiParameters('address'), raw)[0];
  }
}
