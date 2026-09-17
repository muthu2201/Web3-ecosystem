/**
 * SDK integration tests against a real chain.
 *
 * Everything here runs on Anvil with the real contracts deployed: real bytecode, real gas, real
 * reverts. Unit tests with mocked transports would pass just as happily against an SDK that
 * encodes calls no contract can decode, which is precisely the class of bug this catches.
 *
 * It was this harness that found TokenFactory exceeding EIP-170 while all 182 Foundry tests were
 * green, because Foundry raises the code-size limit inside tests and a real node does not.
 */

import { registerChain, registerDeployment } from '@web3eco/chain-registry';
import type { Address, Caip2, Hex } from '@web3eco/core';
import { evmCaip2 } from '@web3eco/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BondingCurveAdapter, deadlineFromChain } from './curve.js';
import { TokenFactoryAdapter, computeCreate2Address, effectiveSalt } from './tokens.js';
import { TokenFactoryAbi } from './generated/index.js';
import { ViemChainReader } from './reader.js';

import { deployEcosystem, startAnvil, TEST_ACCOUNT, TEST_PRIVATE_KEY } from '../../../scripts/local-chain.mjs';

import { createWalletClient, encodeFunctionData, decodeAbiParameters, http, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const ANVIL_CHAIN_ID = 31_337;
const CHAIN: Caip2 = evmCaip2(ANVIL_CHAIN_ID);
const PORT = 8546;

let anvil: { rpcUrl: string; stop: () => void };
let reader: ViemChainReader;
let tokens: TokenFactoryAdapter;
let curves: BondingCurveAdapter;
let manifest: Record<string, Address>;

beforeAll(async () => {
  anvil = await startAnvil({ port: PORT });
  manifest = (await deployEcosystem(anvil.rpcUrl)) as Record<string, Address>;

  registerChain({
    id: CHAIN,
    name: 'Anvil',
    shortName: 'anvil',
    testnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    publicRpcUrls: [anvil.rpcUrl],
    blockExplorer: { name: 'none', url: 'http://localhost' },
    capabilities: {
      supportsStandardCreate2: true,
      supportsTransientStorage: true,
      supportsBatchedCalls: false,
      hasAggregatorSupport: false,
      hasEtherscanV2: false,
      evmVersion: 'cancun',
    },
    dexes: [
      {
        id: 'local',
        kind: 'uniswap-v2',
        router: manifest.dexRouter as Address,
        factory: manifest.dexRouter as Address,
        weth: manifest.weth as Address,
        isDefault: true,
      },
    ],
    blockTimeSeconds: 1,
  });

  registerDeployment(CHAIN, {
    feeRouter: manifest.feeRouter as Address,
    tokenFactory: manifest.tokenFactory as Address,
    liquidityLocker: manifest.liquidityLocker as Address,
    bondingCurveFactory: manifest.bondingCurveFactory as Address,
    presaleFactory: manifest.presaleFactory as Address,
    tokenVesting: manifest.tokenVesting as Address,
    merkleDistributor: manifest.merkleDistributor as Address,
    nftFactory: manifest.nftFactory as Address,
    nftMarketplace: manifest.nftMarketplace as Address,
  });

  reader = new ViemChainReader(CHAIN, { rpcUrl: anvil.rpcUrl });
  const readerFor = () => reader;
  tokens = new TokenFactoryAdapter(readerFor);
  curves = new BondingCurveAdapter(readerFor);
}, 180_000);

afterAll(() => {
  anvil?.stop();
});

const account = privateKeyToAccount(TEST_PRIVATE_KEY as Hex);

function wallet() {
  return createWalletClient({
    account,
    transport: http(anvil.rpcUrl),
    chain: {
      id: ANVIL_CHAIN_ID,
      name: 'Anvil',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [anvil.rpcUrl] } },
    },
  });
}

async function send(tx: { to: Address; data: Hex; value: bigint }): Promise<Address> {
  const hash = await wallet().sendTransaction({ to: tx.to, data: tx.data, value: tx.value });
  const receipt = await reader.publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status).toBe('success');
  return receipt.contractAddress as Address;
}

describe('deployment wiring', () => {
  it('deployed every contract with real code on chain', async () => {
    for (const [name, address] of Object.entries(manifest)) {
      const code = await reader.getCode(address);
      expect(code.length, `${name} at ${address} has no code`).toBeGreaterThan(2);
    }
  });

  it('keeps every deployed contract inside the EIP-170 limit', async () => {
    // The check that would have caught the 59 KB TokenFactory before it reached a node.
    for (const [name, address] of Object.entries(manifest)) {
      const code = await reader.getCode(address);
      const bytes = (code.length - 2) / 2;
      expect(bytes, `${name} exceeds EIP-170`).toBeLessThanOrEqual(24_576);
    }
  });

  it('activated fees through the timelock', async () => {
    const fee = await tokens.readDeployFee(CHAIN);
    expect(fee).toBe(2_000_000_000_000_000n); // 0.002 ether
  });
});

describe('CREATE2 address prediction', () => {
  const options = {
    template: 'standard' as const,
    name: 'Predict',
    symbol: 'PRD',
    supply: 1_000_000n * 10n ** 18n,
    recipient: TEST_ACCOUNT as Address,
    salt: '0x1234567890123456789012345678901234567890123456789012345678901234' as Hex,
  };

  it('agrees with the factory’s own computeAddress', async () => {
    const local = await tokens.predictAddress(CHAIN, TEST_ACCOUNT as Address, options);

    const data = encodeFunctionData({
      abi: TokenFactoryAbi,
      functionName: 'computeAddress',
      args: [0, TEST_ACCOUNT as Address, options.salt, tokens.initCodeHash(options, TEST_ACCOUNT as Address)],
    });
    const raw = await reader.call(manifest.tokenFactory as Address, data);
    const onChain = decodeAbiParameters(parseAbiParameters('address'), raw)[0];

    expect(local.toLowerCase()).toBe(onChain.toLowerCase());
  });

  it('predicts the address the deployment actually lands on', async () => {
    // The assertion that matters: a user is shown this address before signing.
    const predicted = await tokens.predictAddress(CHAIN, TEST_ACCOUNT as Address, options);
    const tx = await tokens.buildDeploy(CHAIN, options);

    const hash = await wallet().sendTransaction({ to: tx.to, data: tx.data, value: tx.value });
    const receipt = await reader.publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');

    const code = await reader.getCode(predicted);
    expect(code.length, 'nothing was deployed at the predicted address').toBeGreaterThan(2);

    const profile = await tokens.readProfile(CHAIN, predicted);
    expect(profile.name).toBe('Predict');
    expect(profile.symbol).toBe('PRD');
    expect(profile.totalSupply).toBe(options.supply);
    expect(profile.template).toBe('standard');
    expect(profile.riskFlags).toBe(0n);
  });

  it('gives different addresses to different deployers using the same salt', async () => {
    const other = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address;
    const mine = await tokens.predictAddress(CHAIN, TEST_ACCOUNT as Address, options);
    const theirs = await tokens.predictAddress(CHAIN, other, options);
    expect(mine).not.toBe(theirs);
    expect(effectiveSalt(TEST_ACCOUNT as Address, options.salt)).not.toBe(
      effectiveSalt(other, options.salt),
    );
  });
});

describe('bonding curve, end to end on a real chain', () => {
  let curveAddress: Address;

  it('launches a curve and mints the whole supply into it', async () => {
    const salt = '0xaaaa000000000000000000000000000000000000000000000000000000000001' as Hex;
    const predicted = await curves.predictCurveAddress(CHAIN, TEST_ACCOUNT as Address, salt);

    const tx = await curves.buildLaunch({
      chain: CHAIN,
      name: 'Degen',
      symbol: 'DGN',
      salt,
      devBuyValue: 0n,
      devBuyMinTokensOut: 0n,
      lockLpInsteadOfBurn: false,
      lpLockDurationSeconds: 0,
    });
    await send(tx);

    curveAddress = predicted;
    const snapshot = await curves.readCurve(CHAIN, curveAddress);
    expect(snapshot.creator.toLowerCase()).toBe(TEST_ACCOUNT.toLowerCase());
    expect(snapshot.graduated).toBe(false);
    expect(snapshot.tokensSold).toBe(0n);
    expect(snapshot.curveSupply).toBe(800_000_000n * 10n ** 18n);
    expect(snapshot.poolPreSeeded).toBe(false);
  });

  it('quotes a buy locally and the chain delivers exactly that', async () => {
    const before = await curves.readCurve(CHAIN, curveAddress);
    const feeBps = await curves.readTradeFeeBps(CHAIN);
    expect(feeBps).toBe(100n); // 1%

    const nativeIn = 10n ** 17n; // 0.1 ETH, under the anti-snipe window cap
    const quote = curves.quoteBuyLocal(before, nativeIn, feeBps, 100n);

    // Chain time, not Date.now(): this fork's clock was advanced past the fee timelock, so a
    // wall-clock deadline would already be in the past. Real L2s drift for their own reasons.
    const tx = await curves.buildBuy(
      CHAIN,
      curveAddress,
      nativeIn,
      quote.minTokensOut,
      await deadlineFromChain(reader, 600),
    );
    await send(tx);

    const after = await curves.readCurve(CHAIN, curveAddress);
    // The locally computed quote must match what the chain actually did, exactly.
    expect(after.tokensSold).toBe(before.tokensSold + quote.tokensOut);
    expect(after.realNativeReserve).toBe(before.realNativeReserve + (nativeIn - quote.fee));
  });

  it('keeps the curve solvent: balance equals its tracked reserve', async () => {
    const snapshot = await curves.readCurve(CHAIN, curveAddress);
    const balance = await reader.getBalance(curveAddress);
    expect(balance).toBe(snapshot.realNativeReserve);
  });
});
