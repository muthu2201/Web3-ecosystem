/**
 * MCP tool definitions.
 *
 * Every tool is either a read or a build-unsigned-transaction. There is deliberately no `signTx`,
 * no `sendTx` and no `approve` — the server has no key and no submission path, so the worst a
 * fully compromised agent can do is propose a transaction a human then declines to sign.
 */

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  /** True when the tool returns an unsigned transaction rather than data. */
  readonly buildsTransaction: boolean;
}

const chainProperty = {
  type: 'string',
  description: 'CAIP-2 chain id, for example "eip155:8453" for Base.',
  pattern: '^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$',
} as const;

const addressProperty = {
  type: 'string',
  description: 'A 20-byte hex address.',
  pattern: '^0x[0-9a-fA-F]{40}$',
} as const;

/**
 * Amounts cross the boundary as decimal STRINGS, never numbers.
 *
 * JSON numbers are IEEE-754 doubles. A balance of 1e27 wei loses its low-order digits the moment
 * it becomes one, and an agent that round-trips an amount through JSON would silently propose a
 * transaction for a different value than the user asked for.
 */
const amountProperty = {
  type: 'string',
  description: 'Amount in the smallest unit, as a decimal string. Never a JSON number.',
  pattern: '^[0-9]{1,78}$',
} as const;

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'listChains',
    description:
      'List the chains this platform supports, with their capabilities and whether aggregator ' +
      'routing is available.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    buildsTransaction: false,
  },
  {
    name: 'getFeeSchedule',
    description:
      'Read the current platform fees for a chain, together with the ceilings compiled into the ' +
      'FeeRouter that no configuration change can exceed.',
    inputSchema: {
      type: 'object',
      properties: { chain: chainProperty },
      required: ['chain'],
      additionalProperties: false,
    },
    buildsTransaction: false,
  },
  {
    name: 'readToken',
    description:
      'Read a token profile: name, symbol, supply, which audited template it was deployed from, ' +
      'and the administrative powers it currently grants, decoded from on-chain risk flags.',
    inputSchema: {
      type: 'object',
      properties: { chain: chainProperty, token: addressProperty },
      required: ['chain', 'token'],
      additionalProperties: false,
    },
    buildsTransaction: false,
  },
  {
    name: 'readCurve',
    description:
      'Read a bonding curve: reserves, progress, graduation target, and whether its pool has ' +
      'been pre-seeded by a third party.',
    inputSchema: {
      type: 'object',
      properties: { chain: chainProperty, curve: addressProperty },
      required: ['chain', 'curve'],
      additionalProperties: false,
    },
    buildsTransaction: false,
  },
  {
    name: 'quoteCurveBuy',
    description:
      'Quote a bonding-curve buy without sending anything. Returns tokens out, the fee, any ' +
      'refund from a partial fill, and whether the buy would complete the curve.',
    inputSchema: {
      type: 'object',
      properties: { chain: chainProperty, curve: addressProperty, nativeIn: amountProperty },
      required: ['chain', 'curve', 'nativeIn'],
      additionalProperties: false,
    },
    buildsTransaction: false,
  },
  {
    name: 'getRiskFlags',
    description:
      'Decode a token’s administrative powers into plain-language findings ranked by ' +
      'severity. Reports explicitly when a check could not be performed rather than implying safety.',
    inputSchema: {
      type: 'object',
      properties: { chain: chainProperty, token: addressProperty },
      required: ['chain', 'token'],
      additionalProperties: false,
    },
    buildsTransaction: false,
  },
  {
    name: 'buildDeployTokenTx',
    description:
      'Build an UNSIGNED transaction deploying a token. Returns the transaction plus the address ' +
      'it will land on. Nothing is sent; the user signs it in their own wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: chainProperty,
        template: {
          type: 'string',
          enum: ['standard', 'mintable', 'pausable', 'governance', 'tax', 'compliance'],
        },
        name: { type: 'string', minLength: 1, maxLength: 64 },
        symbol: { type: 'string', minLength: 1, maxLength: 16 },
        supply: amountProperty,
        recipient: addressProperty,
        admin: addressProperty,
      },
      required: ['chain', 'template', 'name', 'symbol', 'supply', 'recipient'],
      additionalProperties: false,
    },
    buildsTransaction: true,
  },
  {
    name: 'buildCurveBuyTx',
    description:
      'Build an UNSIGNED bonding-curve buy with slippage protection. Nothing is sent; the user ' +
      'signs it in their own wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: chainProperty,
        curve: addressProperty,
        nativeIn: amountProperty,
        slippageBps: { type: 'integer', minimum: 0, maximum: 10_000 },
      },
      required: ['chain', 'curve', 'nativeIn'],
      additionalProperties: false,
    },
    buildsTransaction: true,
  },
  {
    name: 'buildLaunchCurveTx',
    description:
      'Build an UNSIGNED transaction launching a token on a bonding curve. The token is always a ' +
      'fixed-supply, ownerless standard token: no tax, no mint, no pause, no blocklist.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: chainProperty,
        name: { type: 'string', minLength: 1, maxLength: 64 },
        symbol: { type: 'string', minLength: 1, maxLength: 16 },
        devBuyValue: amountProperty,
      },
      required: ['chain', 'name', 'symbol'],
      additionalProperties: false,
    },
    buildsTransaction: true,
  },
];

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}

/**
 * Parse an amount that arrived as a string.
 *
 * Rejects anything that is not a plain decimal integer, including values JavaScript would happily
 * coerce, so a malformed amount fails loudly here rather than becoming a transaction for the
 * wrong number.
 */
export function parseAmount(value: unknown, field: string): bigint {
  if (typeof value === 'number') {
    throw new Error(
      `"${field}" arrived as a JSON number. Amounts must be decimal strings: a number cannot ` +
        'represent a token amount without losing precision.',
    );
  }
  if (typeof value !== 'string' || !/^\d{1,78}$/.test(value)) {
    throw new Error(`"${field}" must be a decimal string in the token's smallest unit`);
  }
  return BigInt(value);
}
