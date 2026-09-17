/**
 * Chain-agnostic identifiers: CAIP-2 (chains), CAIP-10 (accounts), CAIP-19 (assets).
 *
 * Every cross-boundary reference in this system uses these instead of a bare `chainId: number`.
 * A numeric chain id only exists in EVM-land, so a codebase built on it has already decided it
 * will never support Solana without a rewrite. CAIP costs a little ceremony now and keeps the
 * Solana, Sui and TON adapters from being breaking changes later.
 */

export type Caip2 = `${string}:${string}`;
export type Caip10 = `${string}:${string}:${string}`;
export type Caip19 = string;

export class CaipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaipError';
  }
}

const NAMESPACE_RE = /^[-a-z0-9]{3,8}$/;
const REFERENCE_RE = /^[-_a-zA-Z0-9]{1,32}$/;
const ACCOUNT_RE = /^[-.%a-zA-Z0-9]{1,128}$/;

export interface ParsedCaip2 {
  readonly namespace: string;
  readonly reference: string;
}

export function parseCaip2(id: string): ParsedCaip2 {
  const parts = id.split(':');
  if (parts.length !== 2) throw new CaipError(`"${id}" is not a CAIP-2 chain id`);
  const [namespace, reference] = parts as [string, string];
  if (!NAMESPACE_RE.test(namespace)) throw new CaipError(`invalid CAIP-2 namespace in "${id}"`);
  if (!REFERENCE_RE.test(reference)) throw new CaipError(`invalid CAIP-2 reference in "${id}"`);
  return { namespace, reference };
}

export function isCaip2(id: string): id is Caip2 {
  try {
    parseCaip2(id);
    return true;
  } catch {
    return false;
  }
}

/** Build a CAIP-2 id for an EVM chain from its numeric id. */
export function evmCaip2(chainId: number): Caip2 {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new CaipError(`"${chainId}" is not a valid EVM chain id`);
  }
  return `eip155:${chainId}`;
}

/**
 * Extract the numeric EVM chain id from a CAIP-2 id.
 * Throws for non-EVM namespaces rather than returning a misleading number.
 */
export function evmChainId(id: Caip2): number {
  const { namespace, reference } = parseCaip2(id);
  if (namespace !== 'eip155') {
    throw new CaipError(`"${id}" is not an EVM chain; it has no numeric chain id`);
  }
  const n = Number(reference);
  if (!Number.isInteger(n) || n <= 0) throw new CaipError(`invalid EVM chain reference in "${id}"`);
  return n;
}

export function isEvm(id: Caip2): boolean {
  return parseCaip2(id).namespace === 'eip155';
}

export function isSolana(id: Caip2): boolean {
  return parseCaip2(id).namespace === 'solana';
}

export interface ParsedCaip10 {
  readonly chain: Caip2;
  readonly address: string;
}

export function parseCaip10(id: string): ParsedCaip10 {
  const idx = id.lastIndexOf(':');
  if (idx <= 0) throw new CaipError(`"${id}" is not a CAIP-10 account id`);
  const chain = id.slice(0, idx);
  const address = id.slice(idx + 1);
  parseCaip2(chain);
  if (!ACCOUNT_RE.test(address)) throw new CaipError(`invalid account address in "${id}"`);
  return { chain: chain as Caip2, address };
}

export function toCaip10(chain: Caip2, address: string): Caip10 {
  parseCaip2(chain);
  if (!ACCOUNT_RE.test(address)) throw new CaipError(`invalid account address "${address}"`);
  return `${chain}:${address}` as Caip10;
}

export interface ParsedCaip19 {
  readonly chain: Caip2;
  readonly assetNamespace: string;
  readonly assetReference: string;
  readonly tokenId?: string;
}

/** Parse a CAIP-19 asset id, e.g. `eip155:8453/erc20:0xabc...` or `.../erc721:0xabc.../42`. */
export function parseCaip19(id: string): ParsedCaip19 {
  const slash = id.indexOf('/');
  if (slash <= 0) throw new CaipError(`"${id}" is not a CAIP-19 asset id`);
  const chain = id.slice(0, slash);
  parseCaip2(chain);

  const rest = id.slice(slash + 1);
  const segments = rest.split('/');
  const assetPart = segments[0];
  if (assetPart === undefined) throw new CaipError(`"${id}" is missing its asset segment`);

  const [assetNamespace, assetReference] = assetPart.split(':') as [string, string | undefined];
  if (!assetNamespace || !assetReference) throw new CaipError(`invalid asset segment in "${id}"`);

  const tokenId = segments[1];
  return tokenId === undefined
    ? { chain: chain as Caip2, assetNamespace, assetReference }
    : { chain: chain as Caip2, assetNamespace, assetReference, tokenId };
}

/** Build a CAIP-19 id for a fungible token. */
export function erc20Caip19(chain: Caip2, address: string): Caip19 {
  parseCaip2(chain);
  return `${chain}/erc20:${address.toLowerCase()}`;
}

/** Build a CAIP-19 id for a specific NFT. */
export function erc721Caip19(chain: Caip2, address: string, tokenId: bigint | string): Caip19 {
  parseCaip2(chain);
  return `${chain}/erc721:${address.toLowerCase()}/${tokenId.toString()}`;
}

/** Build a CAIP-19 id for a chain's native currency (the `slip44` namespace). */
export function nativeCaip19(chain: Caip2, slip44: number): Caip19 {
  parseCaip2(chain);
  return `${chain}/slip44:${slip44}`;
}
