/**
 * Transaction simulation before signing, via `eth_simulateV1`.
 *
 * THIS IS THE DEFENCE AGAINST THE BYBIT/SAFE CLASS OF ATTACK. In February 2025 attackers
 * compromised a developer machine, injected JavaScript into the served UI, and had a multisig
 * sign a transaction that did something other than what the screen showed. No contract was
 * exploited; roughly $1.46B moved anyway. Every contract in this repository could be flawless and
 * that attack would still work.
 *
 * Simulating the exact payload about to be signed and showing the resulting balance changes is
 * what makes a swapped payload visible BEFORE the signature rather than after the funds are gone.
 * The UI treats a failed simulation as a hard stop, not a warning to click past.
 */

import type { Address, BalanceChange, Caip2, SimulationResult, TxBatch, TxRequest } from '@web3eco/core';
import { evmChainId, nativeCaip19, toCaip10 } from '@web3eco/core';
import type { SimulationPort } from '@web3eco/ports';

export interface SimulationOptions {
  /** RPC endpoint supporting eth_simulateV1. The user's wallet RPC is preferred. */
  readonly rpcUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface SimulateCallResult {
  readonly status?: string;
  readonly gasUsed?: string;
  readonly returnData?: string;
  readonly error?: { readonly message?: string };
}

interface SimulateBlockResult {
  readonly calls?: readonly SimulateCallResult[];
}

export class SimulationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationUnavailableError';
  }
}

export class EthSimulateAdapter implements SimulationPort {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: SimulationOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async simulate(tx: TxRequest, from: Address): Promise<SimulationResult> {
    const [result] = await this.run([tx], from, tx.chain);
    if (!result) throw new SimulationUnavailableError('simulation returned no result');
    return result;
  }

  async simulateBatch(batch: TxBatch, from: Address): Promise<readonly SimulationResult[]> {
    return this.run(batch.calls, from, batch.chain);
  }

  private async run(
    calls: readonly TxRequest[],
    from: Address,
    chain: Caip2,
  ): Promise<SimulationResult[]> {
    evmChainId(chain); // reject non-EVM chains loudly rather than producing a meaningless result

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_simulateV1',
      params: [
        {
          blockStateCalls: [
            {
              calls: calls.map((c) => ({
                from,
                to: c.to,
                data: c.data,
                value: `0x${c.value.toString(16)}`,
              })),
            },
          ],
          // Asks the node to report the balance deltas, which is the part a user actually needs
          // to see: not "this will succeed" but "this moves 12 ETH to an address you do not know".
          traceTransfers: true,
          validation: true,
        },
        'latest',
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let json: { result?: readonly SimulateBlockResult[]; error?: { message?: string } };
    try {
      const response = await this.fetchImpl(this.options.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      json = (await response.json()) as typeof json;
    } catch (err) {
      throw new SimulationUnavailableError(
        `simulation could not be performed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (json.error) {
      // Not every RPC implements eth_simulateV1. Surfaced explicitly so the caller can fall back
      // to another provider rather than silently skipping the check.
      throw new SimulationUnavailableError(
        `this RPC does not support eth_simulateV1: ${json.error.message ?? 'unknown error'}`,
      );
    }

    const block = json.result?.[0];
    const results = block?.calls ?? [];

    return calls.map((call, i) => {
      const r = results[i];
      const success = r?.status === '0x1';
      return {
        success,
        gasUsed: r?.gasUsed ? BigInt(r.gasUsed) : null,
        revertReason: success ? null : (r?.error?.message ?? decodeRevert(r?.returnData)),
        balanceChanges: nativeDeltaOf(call, from, chain),
        warnings: success ? [] : ['This transaction would revert. Do not sign it.'],
      };
    });
  }
}

/**
 * The native-value movement implied by a call.
 *
 * Deliberately narrow: this reports what the transaction explicitly sends, and does not attempt
 * to infer ERC-20 movements from logs. Presenting a partial decode as if it were complete would
 * be worse than presenting a small, honest one, because it would train users to trust a summary
 * that can miss the transfer that matters.
 */
function nativeDeltaOf(call: TxRequest, from: Address, chain: Caip2): BalanceChange[] {
  if (call.value === 0n) return [];
  const asset = nativeCaip19(chain, 60);
  return [
    { account: toCaip10(chain, from), asset, delta: -call.value },
    { account: toCaip10(chain, call.to), asset, delta: call.value },
  ];
}

/** Decode a standard `Error(string)` revert payload, if that is what came back. */
function decodeRevert(returnData: string | undefined): string | null {
  if (!returnData || returnData === '0x') return null;
  if (!returnData.startsWith('0x08c379a0')) return `reverted with data ${returnData.slice(0, 66)}`;
  try {
    const hex = returnData.slice(10 + 128);
    const bytes = hex.match(/.{1,2}/g) ?? [];
    const decoded = bytes
      .map((b) => String.fromCharCode(parseInt(b, 16)))
      .join('')
      .replace(/\0+$/, '');
    return decoded || null;
  } catch {
    return null;
  }
}
