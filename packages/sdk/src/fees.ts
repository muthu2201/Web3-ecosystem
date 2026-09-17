/**
 * Fee reads.
 *
 * Every product's fee is read from the chain rather than hard-coded in the UI. The FeeRouter
 * enforces a bytecode-level ceiling per product that no owner can raise, so showing the live
 * value is both honest and safe: the number on screen is the number the transaction will pay,
 * and the ceiling beside it is a promise the contract cannot break.
 */

import { getDeployment } from '@web3eco/chain-registry';
import type { Caip2, Product } from '@web3eco/core';
import { productOrdinal } from '@web3eco/core';
import type { ChainReaderPort } from '@web3eco/ports';
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { FeeRouterAbi } from './generated/index.js';

export interface ProductFee {
  readonly product: Product;
  /** Basis points taken from a value-denominated product. Zero for flat-fee products. */
  readonly bps: bigint;
  /** Flat native fee per action. Zero for bps products. */
  readonly flatNative: bigint;
  /** Ceiling the contract enforces in bytecode. No owner can raise the fee past this. */
  readonly maxBps: bigint;
  /** Ceiling on the flat fee, immutable for the life of the router. */
  readonly flatNativeHardCap: bigint;
}

export class FeeRouterAdapter {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  /** Read the live fee and both ceilings for one product in a single batched round trip. */
  async readProductFee(chain: Caip2, product: Product): Promise<ProductFee> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const ordinal = productOrdinal(product);

    const [bpsRaw, flatRaw, maxRaw, capRaw] = await reader.multicall([
      {
        to: feeRouter,
        data: encodeFunctionData({ abi: FeeRouterAbi, functionName: 'bpsOf', args: [ordinal] }),
      },
      {
        to: feeRouter,
        data: encodeFunctionData({
          abi: FeeRouterAbi,
          functionName: 'flatNativeOf',
          args: [ordinal],
        }),
      },
      {
        to: feeRouter,
        data: encodeFunctionData({ abi: FeeRouterAbi, functionName: 'maxBps', args: [ordinal] }),
      },
      {
        to: feeRouter,
        data: encodeFunctionData({ abi: FeeRouterAbi, functionName: 'flatNativeHardCap' }),
      },
    ]);

    const u16 = (raw: `0x${string}` | undefined): bigint =>
      !raw || raw === '0x' ? 0n : BigInt(decodeAbiParameters(parseAbiParameters('uint16'), raw)[0]);
    const u256 = (raw: `0x${string}` | undefined): bigint =>
      !raw || raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];

    return {
      product,
      bps: u16(bpsRaw),
      flatNative: u256(flatRaw),
      maxBps: u16(maxRaw),
      flatNativeHardCap: u256(capRaw),
    };
  }

  /** What the router would actually take on `amount` for this product. */
  async feeOn(chain: Caip2, product: Product, amount: bigint): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const raw = await reader.call(
      feeRouter,
      encodeFunctionData({
        abi: FeeRouterAbi,
        functionName: 'feeOn',
        args: [productOrdinal(product), amount],
      }),
    );
    return raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  }

  /**
   * Native currency the router is holding for `account`.
   *
   * Creator fee shares are pulled, not pushed: the router credits a balance and the creator
   * withdraws it. A push would let one reverting recipient block the fee path for everyone.
   */
  async balanceOf(chain: Caip2, account: `0x${string}`): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const raw = await reader.call(
      feeRouter,
      encodeFunctionData({
        abi: FeeRouterAbi,
        functionName: 'balanceOf',
        // address(0) is the router's sentinel for the native currency.
        args: [account, '0x0000000000000000000000000000000000000000'],
      }),
    );
    return raw === '0x' ? 0n : decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  }
}
