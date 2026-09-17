/**
 * Contract verification through the Etherscan V2 multichain API.
 *
 * V2 takes a single key and a `chainid` parameter across 50+ chains, replacing the old
 * one-key-per-explorer arrangement. Free-tier chain coverage was reduced in November 2025, so
 * `isFreeTierCovered` exists to let callers check rather than assume, and Sourcify and Blockscout
 * are declared as fallbacks because a verification path that depends on one provider will
 * eventually fail.
 *
 * A token nobody can read the source of is indistinguishable from a hostile one, so verification
 * is part of the launch flow rather than an afterthought.
 */

import type { Address, Caip2 } from '@web3eco/core';
import { evmChainId } from '@web3eco/core';
import type { VerificationPort } from '@web3eco/ports';

import { HttpClient } from './http.js';

export interface EtherscanOptions {
  /** Edge proxy base URL. The API key stays server-side. */
  readonly baseUrl: string;
  readonly http?: HttpClient;
}

export interface VerificationSource {
  readonly contractName: string;
  /** Standard JSON input, as produced by solc. */
  readonly standardJsonInput: string;
  readonly compilerVersion: string;
  readonly constructorArguments: string;
  readonly optimizationUsed: boolean;
  readonly runs: number;
}

interface EtherscanResponse {
  readonly status?: string;
  readonly message?: string;
  readonly result?: string | readonly { readonly SourceCode?: string }[];
}

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

/**
 * Chains still covered by the Etherscan V2 free tier at the time of writing.
 *
 * Dated and liable to change: coverage was cut in November 2025. Callers should treat a false
 * here as "check before relying on it", not as a permanent answer.
 */
const FREE_TIER_CHAIN_IDS = new Set([1, 10, 56, 137, 8453, 42_161]);

export class EtherscanV2VerificationAdapter implements VerificationPort {
  private readonly http: HttpClient;

  constructor(private readonly options: EtherscanOptions) {
    this.http = options.http ?? new HttpClient({ timeoutMs: 15_000, maxRetries: 2 });
  }

  static isFreeTierCovered(chain: Caip2): boolean {
    try {
      return FREE_TIER_CHAIN_IDS.has(evmChainId(chain));
    } catch {
      return false;
    }
  }

  async verify(chain: Caip2, address: Address, source: unknown): Promise<{ guid: string }> {
    const src = source as VerificationSource;
    if (!src?.standardJsonInput || !src.contractName || !src.compilerVersion) {
      throw new VerificationError(
        'verification requires standardJsonInput, contractName and compilerVersion',
      );
    }

    const body = new URLSearchParams({
      chainid: String(evmChainId(chain)),
      module: 'contract',
      action: 'verifysourcecode',
      codeformat: 'solidity-standard-json-input',
      contractaddress: address,
      contractname: src.contractName,
      compilerversion: src.compilerVersion,
      sourceCode: src.standardJsonInput,
      constructorArguements: src.constructorArguments.replace(/^0x/, ''),
      optimizationUsed: src.optimizationUsed ? '1' : '0',
      runs: String(src.runs),
    });

    const response = await this.http.getJson<EtherscanResponse>(
      `${trimSlash(this.options.baseUrl)}/api`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );

    if (response.status !== '1' || typeof response.result !== 'string') {
      throw new VerificationError(
        `verification was rejected: ${response.result ?? response.message ?? 'unknown reason'}`,
      );
    }
    return { guid: response.result };
  }

  async checkStatus(chain: Caip2, guid: string): Promise<'pending' | 'verified' | 'failed'> {
    const params = new URLSearchParams({
      chainid: String(evmChainId(chain)),
      module: 'contract',
      action: 'checkverifystatus',
      guid,
    });

    const response = await this.http.getJson<EtherscanResponse>(
      `${trimSlash(this.options.baseUrl)}/api?${params.toString()}`,
    );

    const result = typeof response.result === 'string' ? response.result : '';
    if (response.status === '1') return 'verified';
    if (result.toLowerCase().includes('pending')) return 'pending';
    return 'failed';
  }

  async isVerified(chain: Caip2, address: Address): Promise<boolean> {
    const params = new URLSearchParams({
      chainid: String(evmChainId(chain)),
      module: 'contract',
      action: 'getsourcecode',
      address,
    });

    try {
      const response = await this.http.getJson<EtherscanResponse>(
        `${trimSlash(this.options.baseUrl)}/api?${params.toString()}`,
      );
      if (!Array.isArray(response.result)) return false;
      const entry = response.result[0];
      return Boolean(entry?.SourceCode && entry.SourceCode.length > 0);
    } catch {
      // Unknown, not verified. Reporting a contract as verified because the check failed would
      // be exactly the wrong direction to err in.
      return false;
    }
  }
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
