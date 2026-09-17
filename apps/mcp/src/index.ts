/**
 * Remote MCP server exposing the ecosystem to AI agents.
 *
 * Speaks JSON-RPC 2.0 over HTTP, the transport a remote MCP server uses.
 *
 * THE INVARIANT: every state-changing tool returns an UNSIGNED transaction. This server holds no
 * key, has no signing code and no submission path. The 2026 reality that "if the agent is
 * compromised, so is the wallet" only holds when the agent can sign; here it cannot, so the worst
 * outcome of a fully compromised agent is a transaction a human declines in their wallet.
 */

import { allChains, getChain, hasDeployment, swapStrategy } from '@web3eco/chain-registry';
import type { Address, Caip2 } from '@web3eco/core';
import { decodeRiskFlags, isCaip2, quoteBuy, worstSeverity } from '@web3eco/core';
import { BondingCurveAdapter, TokenFactoryAdapter, ViemChainReader } from '@web3eco/sdk';

import { guardTransaction, GuardError, sanitiseOnChainText, SIGNING_WARNING } from './guards.js';
import { findTool, parseAmount, TOOLS } from './tools.js';

export interface Env {
  readonly RATE_LIMIT: KVNamespace;
  readonly MAX_TX_VALUE_WEI?: string;
}

interface JsonRpcRequest {
  readonly jsonrpc?: string;
  readonly id?: string | number | null;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
}

const PROTOCOL_VERSION = '2025-06-18';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'this MCP endpoint accepts POST only' }, 405);
    }

    let body: JsonRpcRequest;
    try {
      body = (await request.json()) as JsonRpcRequest;
    } catch {
      return rpcError(null, -32_700, 'request body was not valid JSON');
    }

    const id = body.id ?? null;

    try {
      switch (body.method) {
        case 'initialize':
          return rpcResult(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'web3eco-mcp', version: '0.1.0' },
            instructions:
              'Every state-changing tool here returns an UNSIGNED transaction. This server ' +
              'cannot sign or send anything. Always show the user the transaction summary, the ' +
              'destination and the value, and let them decide in their own wallet.',
          });

        case 'tools/list':
          return rpcResult(id, {
            tools: TOOLS.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          });

        case 'tools/call':
          return await handleToolCall(id, body.params ?? {}, env);

        case 'ping':
          return rpcResult(id, {});

        default:
          return rpcError(id, -32_601, `unknown method "${body.method ?? ''}"`);
      }
    } catch (err) {
      if (err instanceof GuardError) {
        // Guard rejections are the point of the server, so they are reported clearly rather than
        // flattened into a generic failure.
        return rpcResult(id, {
          content: [{ type: 'text', text: `Refused: ${err.message}` }],
          isError: true,
        });
      }
      return rpcError(id, -32_603, err instanceof Error ? err.message : 'internal error');
    }
  },
} satisfies ExportedHandler<Env>;

async function handleToolCall(
  id: string | number | null,
  params: Record<string, unknown>,
  env: Env,
): Promise<Response> {
  const name = typeof params.name === 'string' ? params.name : '';
  const args = (params.arguments ?? {}) as Record<string, unknown>;

  const tool = findTool(name);
  if (!tool) return rpcError(id, -32_602, `unknown tool "${name}"`);

  const maxValueWei = BigInt(env.MAX_TX_VALUE_WEI ?? '1000000000000000000');
  const result = await dispatch(name, args, { maxValueWei });

  return rpcResult(id, {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  });
}

function requireChain(args: Record<string, unknown>): Caip2 {
  const chain = args.chain;
  if (typeof chain !== 'string' || !isCaip2(chain)) {
    throw new Error('"chain" must be a CAIP-2 chain id such as "eip155:8453"');
  }
  getChain(chain); // rejects chains outside the registry
  if (!hasDeployment(chain)) {
    throw new Error(`the platform is not deployed on ${chain}`);
  }
  return chain;
}

function requireAddress(args: Record<string, unknown>, field: string): Address {
  const value = args[field];
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`"${field}" must be a 20-byte hex address`);
  }
  return value as Address;
}

function readerFor(chain: Caip2): ViemChainReader {
  return new ViemChainReader(chain);
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
  guards: { maxValueWei: bigint },
): Promise<unknown> {
  switch (name) {
    case 'listChains':
      return {
        chains: allChains().map((c) => ({
          id: c.id,
          name: c.name,
          testnet: c.testnet,
          nativeCurrency: c.nativeCurrency,
          swapStrategy: swapStrategy(c.id),
          supportsDeterministicAddresses: c.capabilities.supportsStandardCreate2,
          deployed: hasDeployment(c.id),
        })),
      };

    case 'getFeeSchedule': {
      const chain = requireChain(args);
      const tokens = new TokenFactoryAdapter(readerFor);
      return {
        chain,
        tokenDeployFlatNativeWei: (await tokens.readDeployFee(chain)).toString(),
        // Stated alongside the live values so an agent can tell a user what the fee can never
        // exceed, not merely what it is today.
        hardCapsBps: {
          bondingCurveTrade: 150,
          swap: 100,
          presale: 300,
          fairLaunch: 200,
          nftMint: 200,
          nftMarketplace: 100,
        },
        note:
          'The hard caps are compiled into the FeeRouter and have no setter. No owner action ' +
          'can raise a fee above them.',
      };
    }

    case 'readToken': {
      const chain = requireChain(args);
      const token = requireAddress(args, 'token');
      const profile = await new TokenFactoryAdapter(readerFor).readProfile(chain, token);
      const findings = decodeRiskFlags(profile.riskFlags);

      return {
        address: profile.address,
        // Sanitised: a token name is attacker-controlled text.
        name: sanitiseOnChainText(profile.name),
        symbol: sanitiseOnChainText(profile.symbol, 32),
        decimals: profile.decimals,
        totalSupply: profile.totalSupply.toString(),
        template: profile.template,
        deployer: profile.deployer,
        riskSeverity: worstSeverity(findings),
        riskFindings: findings,
        warning:
          profile.template === 'unknown'
            ? 'This token was not deployed by this platform. Its risk flags could not be read ' +
              'from a known template, so treat the absence of findings as unknown, not safe.'
            : null,
      };
    }

    case 'readCurve': {
      const chain = requireChain(args);
      const curve = requireAddress(args, 'curve');
      const snapshot = await new BondingCurveAdapter(readerFor).readCurve(chain, curve);
      return {
        token: snapshot.token,
        creator: snapshot.creator,
        graduated: snapshot.graduated,
        tokensSold: snapshot.tokensSold.toString(),
        curveSupply: snapshot.curveSupply.toString(),
        realNativeReserveWei: snapshot.realNativeReserve.toString(),
        progressBps: Number((snapshot.tokensSold * 10_000n) / snapshot.curveSupply),
        poolPreSeeded: snapshot.poolPreSeeded,
        warning: snapshot.poolPreSeeded
          ? 'Someone has already put liquidity into this token’s pool before graduation. ' +
            'The graduated price may be distorted. Warn the user before they trade.'
          : null,
      };
    }

    case 'quoteCurveBuy': {
      const chain = requireChain(args);
      const curve = requireAddress(args, 'curve');
      const nativeIn = parseAmount(args.nativeIn, 'nativeIn');

      const adapter = new BondingCurveAdapter(readerFor);
      const snapshot = await adapter.readCurve(chain, curve);
      const feeBps = await adapter.readTradeFeeBps(chain);

      const quote = quoteBuy(
        {
          virtualNativeReserve: snapshot.virtualNativeReserve,
          virtualTokenReserve: snapshot.virtualTokenReserve,
          realNativeReserve: snapshot.realNativeReserve,
          tokensSold: snapshot.tokensSold,
          curveSupply: snapshot.curveSupply,
          graduated: snapshot.graduated,
        },
        nativeIn,
        feeBps,
      );

      return {
        tokensOut: quote.tokensOut.toString(),
        feeWei: quote.fee.toString(),
        nativeSpentWei: quote.nativeSpent.toString(),
        refundWei: quote.refund.toString(),
        completesCurve: quote.completesCurve,
        effectivePriceX18: quote.effectivePriceX18.toString(),
      };
    }

    case 'getRiskFlags': {
      const chain = requireChain(args);
      const token = requireAddress(args, 'token');
      const profile = await new TokenFactoryAdapter(readerFor).readProfile(chain, token);
      const findings = decodeRiskFlags(profile.riskFlags);
      return {
        severity: worstSeverity(findings),
        findings,
        blocking: findings.filter((f) => f.severity === 'critical'),
      };
    }

    case 'buildDeployTokenTx': {
      const chain = requireChain(args);
      const template = args.template as
        | 'standard'
        | 'mintable'
        | 'pausable'
        | 'governance'
        | 'tax'
        | 'compliance';
      const supply = parseAmount(args.supply, 'supply');
      const recipient = requireAddress(args, 'recipient');

      const options = {
        template,
        name: String(args.name ?? ''),
        symbol: String(args.symbol ?? ''),
        supply,
        recipient,
        salt: randomSalt(),
        ...(typeof args.admin === 'string' ? { admin: args.admin as Address } : {}),
      };

      const adapter = new TokenFactoryAdapter(readerFor);
      const tx = guardTransaction(await adapter.buildDeploy(chain, options), guards);
      const predicted = await adapter.predictAddress(chain, recipient, options);

      return {
        unsignedTransaction: serialiseTx(tx),
        predictedTokenAddress: predicted,
        warning: SIGNING_WARNING,
      };
    }

    case 'buildCurveBuyTx': {
      const chain = requireChain(args);
      const curve = requireAddress(args, 'curve');
      const nativeIn = parseAmount(args.nativeIn, 'nativeIn');
      const slippageBps = BigInt(
        typeof args.slippageBps === 'number' ? args.slippageBps : 100,
      );

      const adapter = new BondingCurveAdapter(readerFor);
      const snapshot = await adapter.readCurve(chain, curve);
      const feeBps = await adapter.readTradeFeeBps(chain);
      const quote = adapter.quoteBuyLocal(snapshot, nativeIn, feeBps, slippageBps);

      const reader = readerFor(chain);
      const deadline = (await reader.getBlockTimestamp()) + 600;

      // Curves are runtime clones and so absent from the deployment manifest. They are accepted
      // only after the factory confirms it created this one, which keeps an injected address from
      // becoming the target of a "buy".
      await assertKnownCurve(adapter, chain, curve);

      const tx = await adapter.buildBuy(chain, curve, nativeIn, quote.minTokensOut, deadline);
      if (tx.value > guards.maxValueWei) {
        throw new GuardError(
          `buy of ${tx.value} wei exceeds this server's ceiling of ${guards.maxValueWei} wei`,
        );
      }

      return {
        unsignedTransaction: serialiseTx(tx),
        expectedTokensOut: quote.tokensOut.toString(),
        minimumTokensOut: quote.minTokensOut.toString(),
        feeWei: quote.fee.toString(),
        warning: SIGNING_WARNING,
      };
    }

    case 'buildLaunchCurveTx': {
      const chain = requireChain(args);
      const devBuyValue = args.devBuyValue ? parseAmount(args.devBuyValue, 'devBuyValue') : 0n;

      const adapter = new BondingCurveAdapter(readerFor);
      const tx = guardTransaction(
        await adapter.buildLaunch({
          chain,
          name: String(args.name ?? ''),
          symbol: String(args.symbol ?? ''),
          salt: randomSalt(),
          devBuyValue,
          devBuyMinTokensOut: 0n,
          lockLpInsteadOfBurn: false,
          lpLockDurationSeconds: 0,
        }),
        guards,
      );

      return {
        unsignedTransaction: serialiseTx(tx),
        note:
          'The launched token is a fixed-supply, ownerless standard token. It has no tax, no ' +
          'mint function, no pause and no blocklist, because those capabilities are not wired ' +
          'into the bonding-curve launcher at all.',
        warning: SIGNING_WARNING,
      };
    }

    default:
      throw new Error(`tool "${name}" has no implementation`);
  }
}

/** Confirm a curve address really was created by the platform's factory. */
async function assertKnownCurve(
  adapter: BondingCurveAdapter,
  chain: Caip2,
  curve: Address,
): Promise<void> {
  if (!(await adapter.isPlatformCurve(chain, curve))) {
    throw new GuardError(
      `${curve} is not a curve created by this platform's factory on ${chain}. Refusing to ` +
        'build a transaction targeting it.',
    );
  }
}

/** Amounts leave as strings for the same reason they arrive as strings. */
function serialiseTx(tx: {
  chain: string;
  to: string;
  data: string;
  value: bigint;
  summary: string;
}) {
  return {
    chain: tx.chain,
    to: tx.to,
    data: tx.data,
    value: tx.value.toString(),
    summary: tx.summary,
  };
}

function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

function rpcResult(id: string | number | null, result: unknown): Response {
  return json({ jsonrpc: '2.0', id, result }, 200);
}

function rpcError(id: string | number | null, code: number, message: string): Response {
  return json({ jsonrpc: '2.0', id, error: { code, message } }, 200);
}
