/**
 * Token deployment: building the transaction and predicting where the token will land.
 */

import { getChain, getDeployment } from '@web3eco/chain-registry';
import type { Address, Caip2, Hex, TokenProfile, TokenTemplate, TxRequest } from '@web3eco/core';
import { RISK_FLAGS } from '@web3eco/core';
import type { ChainReaderPort, TokenDeployOptions, TokenFactoryPort } from '@web3eco/ports';
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getAddress,
  keccak256,
  parseAbiParameters,
} from 'viem';

import {
  ComplianceTokenBytecode,
  GovernanceTokenBytecode,
  MintableTokenBytecode,
  PausableTokenBytecode,
  StandardTokenAbi,
  StandardTokenBytecode,
  TaxTokenBytecode,
  TokenFactoryAbi,
} from './generated/index.js';
import { SdkError } from './reader.js';

const TEMPLATE_ORDINAL: Record<TokenTemplate, number> = {
  standard: 0,
  mintable: 1,
  pausable: 2,
  governance: 3,
  tax: 4,
  compliance: 5,
};

const TEMPLATE_FROM_ORDINAL: readonly TokenTemplate[] = [
  'standard',
  'mintable',
  'pausable',
  'governance',
  'tax',
  'compliance',
];

/**
 * Creation bytecode per template, exported from the Foundry build.
 *
 * CREATE2 addresses depend on the exact creation code, so these must come from the same build
 * that produced the deployed factory. That is why they are generated rather than pinned by hand:
 * a stale constant here would make the UI promise an address the deployment never lands on.
 */
const TEMPLATE_BYTECODE: Record<TokenTemplate, `0x${string}`> = {
  standard: StandardTokenBytecode,
  mintable: MintableTokenBytecode,
  pausable: PausableTokenBytecode,
  governance: GovernanceTokenBytecode,
  tax: TaxTokenBytecode,
  compliance: ComplianceTokenBytecode,
};

export class TokenOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenOptionsError';
  }
}

/** Constructor argument encoding per template, matching each Solidity constructor exactly. */
function encodeConstructorArgs(options: TokenDeployOptions, deployer: Address): Hex {
  switch (options.template) {
    case 'standard':
      return encodeAbiParameters(
        parseAbiParameters('string, string, uint256, address, address'),
        [options.name, options.symbol, options.supply, options.recipient, deployer],
      );

    case 'mintable':
    case 'governance': {
      const cap = required(options.cap, 'cap', options.template);
      const admin = required(options.admin, 'admin', options.template);
      return encodeAbiParameters(
        parseAbiParameters('string, string, uint256, uint256, address, address'),
        [options.name, options.symbol, cap, options.supply, options.recipient, admin],
      );
    }

    case 'pausable': {
      const admin = required(options.admin, 'admin', 'pausable');
      return encodeAbiParameters(
        parseAbiParameters('string, string, uint256, address, address'),
        [options.name, options.symbol, options.supply, options.recipient, admin],
      );
    }

    case 'tax': {
      const admin = required(options.admin, 'admin', 'tax');
      const taxRecipient = required(options.taxRecipient, 'taxRecipient', 'tax');
      const maxTaxBps = required(options.maxTaxBps, 'maxTaxBps', 'tax');
      const buyTaxBps = options.buyTaxBps ?? 0;
      const sellTaxBps = options.sellTaxBps ?? 0;
      validateTax(maxTaxBps, buyTaxBps, sellTaxBps);
      return encodeAbiParameters(
        parseAbiParameters(
          'string, string, uint256, address, address, address, uint16, uint16, uint16',
        ),
        [
          options.name,
          options.symbol,
          options.supply,
          options.recipient,
          admin,
          taxRecipient,
          maxTaxBps,
          buyTaxBps,
          sellTaxBps,
        ],
      );
    }

    case 'compliance': {
      const admin = required(options.admin, 'admin', 'compliance');
      return encodeAbiParameters(
        parseAbiParameters('string, string, uint256, address, address, bool'),
        [
          options.name,
          options.symbol,
          options.supply,
          options.recipient,
          admin,
          options.allowlistEnabled ?? false,
        ],
      );
    }
  }
}

function required<T>(value: T | undefined, field: string, template: string): T {
  if (value === undefined) {
    throw new TokenOptionsError(`the "${template}" template requires "${field}"`);
  }
  return value;
}

/**
 * Reject tax parameters the contract would reject anyway.
 *
 * Checking client-side is not about trusting the client — the contract enforces all of this. It
 * is about failing before the user pays gas for a transaction that cannot succeed.
 */
function validateTax(maxTaxBps: number, buyTaxBps: number, sellTaxBps: number): void {
  const ABSOLUTE_MAX = 1_000; // matches TaxToken.ABSOLUTE_MAX_TAX_BPS
  if (maxTaxBps > ABSOLUTE_MAX) {
    throw new TokenOptionsError(
      `maxTaxBps of ${maxTaxBps} exceeds the contract's absolute ceiling of ${ABSOLUTE_MAX} (10%)`,
    );
  }
  if (buyTaxBps > maxTaxBps || sellTaxBps > maxTaxBps) {
    throw new TokenOptionsError('buy and sell tax must not exceed maxTaxBps');
  }
}

function validateCommon(options: TokenDeployOptions): void {
  if (options.supply <= 0n) throw new TokenOptionsError('supply must be positive');
  if (options.name.trim() === '') throw new TokenOptionsError('name must not be empty');
  if (options.symbol.trim() === '') throw new TokenOptionsError('symbol must not be empty');
  if (options.cap !== undefined && options.supply > options.cap) {
    throw new TokenOptionsError('initial supply must not exceed the cap');
  }
}

export class TokenFactoryAdapter implements TokenFactoryPort {
  constructor(private readonly readerFor: (chain: Caip2) => ChainReaderPort) {}

  async buildDeploy(chain: Caip2, options: TokenDeployOptions): Promise<TxRequest> {
    validateCommon(options);
    const addresses = getDeployment(chain);
    const fee = await this.readDeployFee(chain);
    const base = {
      name: options.name,
      symbol: options.symbol,
      supply: options.supply,
      recipient: options.recipient,
      salt: options.salt,
    } as const;

    let data: Hex;
    switch (options.template) {
      case 'standard':
        data = encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: 'deployStandard',
          args: [base],
        });
        break;
      case 'pausable':
        data = encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: 'deployPausable',
          args: [base, required(options.admin, 'admin', 'pausable')],
        });
        break;
      case 'mintable':
      case 'governance': {
        const capped = {
          name: options.name,
          symbol: options.symbol,
          cap: required(options.cap, 'cap', options.template),
          initialSupply: options.supply,
          recipient: options.recipient,
          admin: required(options.admin, 'admin', options.template),
          salt: options.salt,
        } as const;
        data = encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: options.template === 'mintable' ? 'deployMintable' : 'deployGovernance',
          args: [capped],
        });
        break;
      }
      case 'tax': {
        const maxTaxBps = required(options.maxTaxBps, 'maxTaxBps', 'tax');
        validateTax(maxTaxBps, options.buyTaxBps ?? 0, options.sellTaxBps ?? 0);
        data = encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: 'deployTax',
          args: [
            {
              name: options.name,
              symbol: options.symbol,
              supply: options.supply,
              recipient: options.recipient,
              owner: required(options.admin, 'admin', 'tax'),
              taxRecipient: required(options.taxRecipient, 'taxRecipient', 'tax'),
              maxTaxBps,
              buyTaxBps: options.buyTaxBps ?? 0,
              sellTaxBps: options.sellTaxBps ?? 0,
              salt: options.salt,
            },
          ],
        });
        break;
      }
      case 'compliance':
        data = encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: 'deployCompliance',
          args: [
            {
              name: options.name,
              symbol: options.symbol,
              supply: options.supply,
              recipient: options.recipient,
              admin: required(options.admin, 'admin', 'compliance'),
              allowlistEnabled: options.allowlistEnabled ?? false,
              salt: options.salt,
            },
          ],
        });
        break;
    }

    return {
      chain,
      to: addresses.tokenFactory,
      data,
      value: fee,
      summary: `Deploy ${options.symbol} (${options.template} template) on ${getChain(chain).name}`,
    };
  }

  /**
   * Compute the token's future address locally.
   *
   * The factory salts CREATE2 with `keccak256(deployer, userSalt)` so two deployers using the
   * same salt cannot collide and nobody can front-run an address someone else computed. That
   * derivation is reproduced here exactly; `sdk.test.ts` checks it against the factory's own
   * `computeAddress`, because a mismatch would mean showing a user one address and deploying to
   * another.
   */
  async predictAddress(
    chain: Caip2,
    deployer: Address,
    options: TokenDeployOptions,
  ): Promise<Address> {
    validateCommon(options);
    const { tokenFactory } = getDeployment(chain);
    const initCodeHash = this.initCodeHash(options, deployer);
    return computeCreate2Address(tokenFactory, effectiveSalt(deployer, options.salt), initCodeHash);
  }

  /** keccak256(creationCode ++ encodedConstructorArgs) for this template and options. */
  initCodeHash(options: TokenDeployOptions, deployer: Address): Hex {
    const bytecode = TEMPLATE_BYTECODE[options.template];
    if (!bytecode || bytecode === '0x') {
      throw new SdkError(`no creation bytecode available for template "${options.template}"`);
    }
    const args = encodeConstructorArgs(options, deployer);
    return keccak256(`${bytecode}${args.slice(2)}` as Hex);
  }

  async readDeployFee(chain: Caip2): Promise<bigint> {
    const reader = this.readerFor(chain);
    const { feeRouter } = getDeployment(chain);
    const data = encodeFunctionData({
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
      args: [0], // Product.TokenDeploy
    });
    const result = await reader.call(feeRouter, data);
    if (result === '0x') return 0n;
    return decodeAbiParameters(parseAbiParameters('uint256'), result)[0];
  }

  /**
   * Read a token's profile straight from chain state.
   *
   * `riskFlags` comes from the token itself rather than a database, so what the listing page
   * shows is what the contract currently permits — including after an owner has renounced,
   * which a cached record would miss.
   */
  async readProfile(chain: Caip2, token: Address): Promise<TokenProfile> {
    const reader = this.readerFor(chain);
    const { tokenFactory } = getDeployment(chain);

    const calls = [
      { to: token, data: encodeFunctionData({ abi: StandardTokenAbi, functionName: 'name' }) },
      { to: token, data: encodeFunctionData({ abi: StandardTokenAbi, functionName: 'symbol' }) },
      { to: token, data: encodeFunctionData({ abi: StandardTokenAbi, functionName: 'decimals' }) },
      {
        to: token,
        data: encodeFunctionData({ abi: StandardTokenAbi, functionName: 'totalSupply' }),
      },
      { to: token, data: encodeFunctionData({ abi: StandardTokenAbi, functionName: 'riskFlags' }) },
      {
        to: tokenFactory,
        data: encodeFunctionData({
          abi: TokenFactoryAbi,
          functionName: 'deploymentOf',
          args: [token],
        }),
      },
    ] as const;

    const [nameRaw, symbolRaw, decimalsRaw, supplyRaw, flagsRaw, deploymentRaw] =
      await reader.multicall(calls);

    const deployment = decodeDeployment(deploymentRaw);

    return {
      asset: `${chain}/erc20:${token.toLowerCase()}`,
      chain,
      address: token,
      name: decodeString(nameRaw),
      symbol: decodeString(symbolRaw),
      decimals: decodeUint(decimalsRaw, 18),
      totalSupply: decodeBigint(supplyRaw),
      // A token outside the factory registry reports no flags rather than a reassuring zero:
      // callers distinguish the two through `template === 'unknown'`.
      riskFlags: flagsRaw && flagsRaw !== '0x' ? decodeBigint(flagsRaw) : RISK_FLAGS.NONE,
      template: deployment?.template ?? 'unknown',
      deployer: deployment?.deployer ?? null,
      deployedAt: deployment?.deployedAt ?? null,
    };
  }
}

function decodeString(raw: Hex | undefined): string {
  if (!raw || raw === '0x') return '';
  try {
    return decodeAbiParameters(parseAbiParameters('string'), raw)[0];
  } catch {
    return '';
  }
}

function decodeUint(raw: Hex | undefined, fallback: number): number {
  if (!raw || raw === '0x') return fallback;
  try {
    return Number(decodeAbiParameters(parseAbiParameters('uint8'), raw)[0]);
  } catch {
    return fallback;
  }
}

function decodeBigint(raw: Hex | undefined): bigint {
  if (!raw || raw === '0x') return 0n;
  try {
    return decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
  } catch {
    return 0n;
  }
}

function decodeDeployment(
  raw: Hex | undefined,
): { deployer: Address; deployedAt: number; template: TokenTemplate } | null {
  if (!raw || raw === '0x') return null;
  try {
    const [deployer, deployedAt, template] = decodeAbiParameters(
      parseAbiParameters('address, uint64, uint8'),
      raw,
    );
    const name = TEMPLATE_FROM_ORDINAL[Number(template)];
    if (!name) return null;
    return { deployer, deployedAt: Number(deployedAt), template: name };
  } catch {
    return null;
  }
}

/** Salt the factory actually uses: `keccak256(abi.encode(deployer, userSalt))`. */
export function effectiveSalt(deployer: Address, userSalt: Hex): Hex {
  return keccak256(encodeAbiParameters(parseAbiParameters('address, bytes32'), [deployer, userSalt]));
}

/** Standard CREATE2 derivation: `keccak256(0xff ++ deployer ++ salt ++ initCodeHash)[12:]`. */
export function computeCreate2Address(deployer: Address, salt: Hex, initCodeHash: Hex): Address {
  const packed = encodePacked(
    ['bytes1', 'address', 'bytes32', 'bytes32'],
    ['0xff', deployer, salt, initCodeHash],
  );
  return getAddress(`0x${keccak256(packed).slice(26)}`);
}

export { TEMPLATE_ORDINAL, TEMPLATE_FROM_ORDINAL };
