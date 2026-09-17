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
import { LiquidityLockerAdapter } from './locker.js';
import { NftAdapter } from './nft.js';
import { PresaleAdapter, tokensNeededFor, type PresaleCreateOptions } from './presale.js';
import { TokenFactoryAdapter, computeCreate2Address, effectiveSalt } from './tokens.js';
import { StandardTokenAbi, TokenFactoryAbi } from './generated/index.js';
import { ViemChainReader } from './reader.js';

import {
  deployEcosystem,
  rpc,
  startAnvil,
  TEST_ACCOUNT,
  TEST_PRIVATE_KEY,
} from '../../../scripts/local-chain.mjs';

import { createWalletClient, encodeFunctionData, decodeAbiParameters, http, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const ANVIL_CHAIN_ID = 31_337;
const CHAIN: Caip2 = evmCaip2(ANVIL_CHAIN_ID);
const PORT = 8546;

let anvil: { rpcUrl: string; stop: () => void };
let reader: ViemChainReader;
let tokens: TokenFactoryAdapter;
let curves: BondingCurveAdapter;
let presales: PresaleAdapter;
let nfts: NftAdapter;
let locker: LiquidityLockerAdapter;
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
  presales = new PresaleAdapter(readerFor);
  nfts = new NftAdapter(readerFor);
  locker = new LiquidityLockerAdapter(readerFor);
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

/**
 * Helpers shared by the sale, collection and locker suites below.
 *
 * `deployToken` gives each suite its own fresh ERC-20 rather than reusing one across them, so a
 * balance consumed by one test cannot silently change the outcome of another.
 */
async function deployToken(salt: Hex, symbol: string, supply: bigint): Promise<Address> {
  const options = {
    template: 'standard' as const,
    name: symbol,
    symbol,
    supply,
    recipient: TEST_ACCOUNT as Address,
    salt,
  };
  const predicted = await tokens.predictAddress(CHAIN, TEST_ACCOUNT as Address, options);
  await send(await tokens.buildDeploy(CHAIN, options));
  return predicted;
}

/** Advance the chain's clock. Anvil only, and the reason every deadline is read from the chain. */
async function warp(seconds: number): Promise<void> {
  await rpc(anvil.rpcUrl, 'evm_increaseTime', [seconds]);
  await rpc(anvil.rpcUrl, 'evm_mine', []);
}

async function balanceOf(token: Address, who: Address): Promise<bigint> {
  const raw = await reader.call(
    token,
    encodeFunctionData({ abi: StandardTokenAbi, functionName: 'balanceOf', args: [who] }),
  );
  return decodeAbiParameters(parseAbiParameters('uint256'), raw)[0];
}

describe('presale, end to end on a real chain', () => {
  let token: Address;
  let presale: Address;
  let options: PresaleCreateOptions;

  const SALT = '0xbbbb000000000000000000000000000000000000000000000000000000000001' as Hex;
  const HARD_CAP = 4n * 10n ** 18n;
  const SOFT_CAP = 10n ** 18n;

  it('funds the sale with exactly the tokens the SDK computed', async () => {
    token = await deployToken(
      '0xbbbb000000000000000000000000000000000000000000000000000000000002' as Hex,
      'SALE',
      1_000_000n * 10n ** 18n,
    );

    const now = await reader.getBlockTimestamp();
    options = {
      chain: CHAIN,
      token,
      tokensPerNative: 1_000n * 10n ** 18n,
      liquidityTokensPerNative: 800n * 10n ** 18n,
      softCap: SOFT_CAP,
      hardCap: HARD_CAP,
      minContribution: 10n ** 16n,
      maxContribution: 2n * 10n ** 18n,
      startsAt: now + 120,
      endsAt: now + 120 + 7_200,
      liquidityBps: 7_000,
      lockLpInsteadOfBurn: false,
      lpLockDurationSeconds: 0,
      whitelistRoot: `0x${'0'.repeat(64)}` as Hex,
      isFairLaunch: false,
      salt: SALT,
    };

    presale = await presales.predictPresaleAddress(CHAIN, TEST_ACCOUNT as Address, SALT);
    const batch = await presales.buildCreatePresale(options);
    expect(batch.calls).toHaveLength(2); // exact approval, then creation

    for (const call of batch.calls) await send(call);

    // The whole point of computing `tokensNeeded` client-side: the figure shown to the creator
    // before they approve must be the figure the factory actually pulls. A mismatch would mean
    // either a failed creation or an over-approval.
    const funded = await balanceOf(token, presale);
    expect(funded).toBe(tokensNeededFor(options));

    expect(await presales.isPlatformPresale(CHAIN, presale)).toBe(true);
  });

  it('reads the sale back with the parameters it was created with', async () => {
    const snapshot = await presales.readPresale(CHAIN, presale);
    expect(snapshot.token.toLowerCase()).toBe(token.toLowerCase());
    // The factory overwrites `owner` with msg.sender, which is what stops a sale being created
    // on someone else's behalf and pointed at an attacker's payout address.
    expect(snapshot.owner.toLowerCase()).toBe(TEST_ACCOUNT.toLowerCase());
    expect(snapshot.state).toBe('pending');
    expect(snapshot.softCap).toBe(SOFT_CAP);
    expect(snapshot.hardCap).toBe(HARD_CAP);
    expect(snapshot.liquidityBps).toBe(7_000n);
    expect(snapshot.whitelisted).toBe(false);
    expect(snapshot.isFairLaunch).toBe(false);
  });

  it('accepts a contribution once the window opens and records the allocation', async () => {
    await warp(180);
    expect((await presales.readPresale(CHAIN, presale)).state).toBe('live');

    const amount = 2n * 10n ** 18n;
    await send(await presales.buildContribute(CHAIN, presale, amount, []));

    const position = await presales.readPosition(CHAIN, presale, TEST_ACCOUNT as Address);
    expect(position.contribution).toBe(amount);
    expect(position.allocation).toBe((amount * options.tokensPerNative) / 10n ** 18n);
    expect(position.hasClaimed).toBe(false);

    const snapshot = await presales.readPresale(CHAIN, presale);
    expect(snapshot.totalRaised).toBe(amount);
    expect(snapshot.state).toBe('live');
  });

  it('moves to awaiting finalisation when the window closes above the soft cap', async () => {
    await warp(7_200);
    expect((await presales.readPresale(CHAIN, presale)).state).toBe('awaitingFinalisation');
  });

  it('finalises, seeds the pool, and pays out exactly the recorded allocation', async () => {
    await send(await presales.buildFinalise(CHAIN, presale));
    expect((await presales.readPresale(CHAIN, presale)).state).toBe('succeeded');

    const before = await balanceOf(token, TEST_ACCOUNT as Address);
    const owed = (await presales.readPosition(CHAIN, presale, TEST_ACCOUNT as Address)).allocation;

    await send(await presales.buildClaim(CHAIN, presale));

    expect(await balanceOf(token, TEST_ACCOUNT as Address)).toBe(before + owed);
    expect(
      (await presales.readPosition(CHAIN, presale, TEST_ACCOUNT as Address)).hasClaimed,
    ).toBe(true);
  });

  it('lists the sale through the factory’s pagination', async () => {
    const total = await presales.totalPresales(CHAIN);
    expect(total).toBeGreaterThan(0);
    const page = await presales.listPresales(CHAIN, 0, total);
    expect(page.map((a) => a.toLowerCase())).toContain(presale.toLowerCase());
  });
});

describe('presale refunds when the soft cap is missed', () => {
  it('reports "failed" and refunds the contributor in full', async () => {
    const token = await deployToken(
      '0xbbbb000000000000000000000000000000000000000000000000000000000003' as Hex,
      'FAIL',
      1_000_000n * 10n ** 18n,
    );
    const salt = '0xbbbb000000000000000000000000000000000000000000000000000000000004' as Hex;
    const now = await reader.getBlockTimestamp();

    const options: PresaleCreateOptions = {
      chain: CHAIN,
      token,
      tokensPerNative: 1_000n * 10n ** 18n,
      liquidityTokensPerNative: 800n * 10n ** 18n,
      // A soft cap deliberately above what will be contributed.
      softCap: 3n * 10n ** 18n,
      hardCap: 5n * 10n ** 18n,
      minContribution: 10n ** 16n,
      maxContribution: 10n ** 18n,
      startsAt: now + 120,
      endsAt: now + 120 + 7_200,
      liquidityBps: 6_000,
      lockLpInsteadOfBurn: false,
      lpLockDurationSeconds: 0,
      whitelistRoot: `0x${'0'.repeat(64)}` as Hex,
      isFairLaunch: true,
      salt,
    };

    const presale = await presales.predictPresaleAddress(CHAIN, TEST_ACCOUNT as Address, salt);
    for (const call of (await presales.buildCreatePresale(options)).calls) await send(call);

    await warp(180);
    const contribution = 10n ** 18n;
    await send(await presales.buildContribute(CHAIN, presale, contribution, []));

    await warp(7_200);
    expect((await presales.readPresale(CHAIN, presale)).state).toBe('failed');

    const balanceBefore = await reader.getBalance(TEST_ACCOUNT as Address);
    await send(await presales.buildRefund(CHAIN, presale));
    const balanceAfter = await reader.getBalance(TEST_ACCOUNT as Address);

    // Gas makes the net change smaller than the contribution, but the contract must return the
    // full amount: the sale's own balance is what proves it.
    expect(balanceAfter).toBeGreaterThan(balanceBefore);
    expect(await reader.getBalance(presale)).toBe(0n);
    expect(
      (await presales.readPosition(CHAIN, presale, TEST_ACCOUNT as Address)).hasRefunded,
    ).toBe(true);
  });
});

describe('NFT collection, end to end on a real chain', () => {
  let collection: Address;

  it('deploys a collection through the factory', async () => {
    const tx = await nfts.buildDeployCollection({
      chain: CHAIN,
      name: 'Cold Horizons',
      symbol: 'HRZN',
      baseURI: 'ipfs://bafy/',
      contractURI: 'ipfs://bafy/collection.json',
      maxSupply: 100n,
      owner: TEST_ACCOUNT as Address,
      royaltyReceiver: TEST_ACCOUNT as Address,
      royaltyBps: 500,
      salt: '0xcccc000000000000000000000000000000000000000000000000000000000001' as Hex,
    });
    expect(tx.value).toBe(1_000_000_000_000_000n); // 0.001 ether, the configured deploy fee
    await send(tx);

    const total = await nfts.totalCollections(CHAIN);
    expect(total).toBe(1);
    const [only] = await nfts.listCollections(CHAIN, 0, 1);
    collection = only as Address;

    const snapshot = await nfts.readCollection(CHAIN, collection);
    expect(snapshot.name).toBe('Cold Horizons');
    expect(snapshot.symbol).toBe('HRZN');
    expect(snapshot.maxSupply).toBe(100n);
    expect(snapshot.totalMinted).toBe(0n);
    expect(snapshot.metadataFrozen).toBe(false);
    expect(snapshot.isPlatformCollection).toBe(true);
  });

  it('adds a phase and mints from it at exactly the quoted price', async () => {
    const now = await reader.getBlockTimestamp();
    const price = 10n ** 16n; // 0.01 ETH

    await send(
      await nfts.buildAddPhase(CHAIN, collection, {
        merkleRoot: `0x${'0'.repeat(64)}` as Hex,
        price,
        startsAt: now,
        endsAt: now + 86_400,
        maxPerWallet: 5,
        maxSupply: 0,
      }),
    );

    const phase = await nfts.readPhase(CHAIN, collection, 0);
    expect(phase.price).toBe(price);
    expect(phase.maxPerWallet).toBe(5);

    const quantity = 3n;
    const mint = await nfts.buildMint(CHAIN, collection, 0, quantity, []);
    // The contract rejects both under- and overpayment, so the SDK's value must be exact.
    expect(mint.value).toBe(price * quantity);
    await send(mint);

    const after = await nfts.readCollection(CHAIN, collection);
    expect(after.totalMinted).toBe(quantity);
    expect(await nfts.mintedInPhase(CHAIN, collection, 0, TEST_ACCOUNT as Address)).toBe(quantity);
    // Proceeds are pulled by the owner, not pushed, so they sit in the contract until withdrawn.
    expect(after.proceeds).toBeGreaterThan(0n);
  });

  it('lets the owner withdraw the accrued proceeds', async () => {
    const before = await nfts.readCollection(CHAIN, collection);
    await send(await nfts.buildWithdrawProceeds(CHAIN, collection, TEST_ACCOUNT as Address));
    const after = await nfts.readCollection(CHAIN, collection);
    expect(before.proceeds).toBeGreaterThan(0n);
    expect(after.proceeds).toBe(0n);
  });
});

describe('liquidity locker, end to end on a real chain', () => {
  it('locks tokens and refuses to release them before the unlock time', async () => {
    const token = await deployToken(
      '0xdddd000000000000000000000000000000000000000000000000000000000001' as Hex,
      'LOCK',
      1_000n * 10n ** 18n,
    );
    const amount = 100n * 10n ** 18n;
    const now = await reader.getBlockTimestamp();
    const unlockTime = now + 30 * 86_400;

    const batch = await locker.buildLock(
      CHAIN,
      token,
      amount,
      unlockTime,
      TEST_ACCOUNT as Address,
    );
    expect(batch.calls).toHaveLength(2); // exact approval, then the lock
    for (const call of batch.calls) await send(call);

    const ids = await locker.lockIdsOfOwner(CHAIN, TEST_ACCOUNT as Address);
    expect(ids.length).toBeGreaterThan(0);
    const lockId = ids[ids.length - 1] as bigint;

    const record = await locker.readLock(CHAIN, lockId);
    expect(record.token.toLowerCase()).toBe(token.toLowerCase());
    expect(record.owner.toLowerCase()).toBe(TEST_ACCOUNT.toLowerCase());
    expect(record.amount).toBe(amount);
    expect(record.unlockTime).toBe(unlockTime);
    expect(record.unlocked).toBe(false);

    const summary = await locker.lockSummary(CHAIN, token);
    expect(summary.amount).toBe(amount);
    expect(summary.latestUnlock).toBe(unlockTime);

    // Withdrawing early must revert. Anything else would make the lock meaningless.
    const early = await locker.buildWithdraw(CHAIN, lockId, amount, TEST_ACCOUNT as Address);
    await expect(
      wallet().sendTransaction({ to: early.to, data: early.data, value: early.value }),
    ).rejects.toThrow();

    // Past the unlock, the same call succeeds and the tokens come back in full.
    await warp(30 * 86_400 + 60);
    expect((await locker.readLock(CHAIN, lockId)).unlocked).toBe(true);

    const before = await balanceOf(token, TEST_ACCOUNT as Address);
    await send(await locker.buildWithdraw(CHAIN, lockId, amount, TEST_ACCOUNT as Address));
    expect(await balanceOf(token, TEST_ACCOUNT as Address)).toBe(before + amount);
  });
});
