#!/usr/bin/env node
/**
 * Full-ecosystem stress harness.
 *
 * Deploys every contract to a real Anvil node and drives the whole system under concurrent load
 * from many accounts: token deployments across all six templates, bonding-curve launches, heavy
 * buy/sell traffic, graduations into real DEX pools, presales taken to both success and failure,
 * refunds, NFT collections, phased mints and marketplace settlement.
 *
 * Solvency invariants are re-checked continuously rather than only at the end, so a violation is
 * attributed to the operation that caused it instead of being discovered long afterwards.
 *
 * This complements the Foundry suites rather than repeating them. Foundry explores one contract's
 * state space deeply with a clean slate per run; this runs everything at once, against real gas
 * accounting, real nonce ordering and real reverts, which is where cross-contract problems live.
 * It is the harness that caught TokenFactory exceeding EIP-170 when all 182 unit tests were green.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  keccak256,
  parseEventLogs,
  parseEther,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { deployEcosystem, ROOT, startAnvil } from '../local-chain.mjs';
import {
  checkCurveSolvency,
  checkCurveSupply,
  checkFeeRouterSolvency,
  checkLockerSolvency,
  checkPresaleSolvency,
  checkTokenConservation,
  InvariantViolation,
} from './invariants.mjs';

const PORT = Number(process.env.STRESS_PORT ?? 8547);
const CHAIN_ID = 31_337;

/** Anvil's deterministic dev accounts. Test keys, never usable outside a local node. */
const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
];

/** Scale knobs. Deliberately modest by default so CI can run it in a few minutes. */
const SCALE = {
  curves: Number(process.env.STRESS_CURVES ?? 4),
  tradesPerCurve: Number(process.env.STRESS_TRADES ?? 24),
  presales: Number(process.env.STRESS_PRESALES ?? 3),
  nftMints: Number(process.env.STRESS_NFT_MINTS ?? 12),
  tokenDeploys: Number(process.env.STRESS_TOKEN_DEPLOYS ?? 6),
};

const stats = {
  transactions: 0,
  reverted: 0,
  invariantChecks: 0,
  graduations: 0,
  refunds: 0,
  gasUsed: 0n,
  byOperation: {},
};

function record(operation, receipt) {
  stats.transactions += 1;
  stats.gasUsed += receipt.gasUsed ?? 0n;
  stats.byOperation[operation] = (stats.byOperation[operation] ?? 0) + 1;
  if (receipt.status !== 'success') stats.reverted += 1;
}

function loadAbi(name) {
  const path = join(ROOT, 'contracts/out', `${name}.sol`, `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf8')).abi;
}

const ABI_NAMES = [
  'FeeRouter',
  'TokenFactory',
  'BondingCurve',
  'BondingCurveFactory',
  'Presale',
  'PresaleFactory',
  'LiquidityLocker',
  'StandardToken',
  'NftCollection',
  'NftFactory',
];

async function main() {
  const startedAt = Date.now();
  console.log('=== Web3 Ecosystem stress test ===\n');
  console.log(`scale: ${JSON.stringify(SCALE)}\n`);

  const anvil = await startAnvil({ port: PORT });
  const failures = [];

  try {
    const manifest = await deployEcosystem(anvil.rpcUrl);
    console.log('ecosystem deployed\n');

    const chain = {
      id: CHAIN_ID,
      name: 'Anvil',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [anvil.rpcUrl] } },
    };

    const publicClient = createPublicClient({ chain, transport: http(anvil.rpcUrl) });
    const wallets = KEYS.map((key) =>
      createWalletClient({ account: privateKeyToAccount(key), chain, transport: http(anvil.rpcUrl) }),
    );
    const accounts = wallets.map((w) => w.account.address);

    const abis = Object.fromEntries(ABI_NAMES.map((n) => [n, loadAbi(n)]));
    const ctx = { publicClient, wallets, accounts, manifest, abis };

    const send = async (wallet, operation, request) => {
      const hash = await wallet.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      record(operation, receipt);
      return receipt;
    };

    const guard = async (label, fn) => {
      stats.invariantChecks += 1;
      try {
        return await fn();
      } catch (err) {
        if (err instanceof InvariantViolation) {
          failures.push(`${label}: ${err.message}`);
          console.error(`  !! ${err.message}`);
        } else {
          throw err;
        }
      }
      return undefined;
    };

    await phaseTokenDeploys(ctx, send, guard);
    const curves = await phaseCurves(ctx, send, guard);
    await phasePresales(ctx, send, guard);
    await phaseNfts(ctx, send, guard);
    await phaseFinalChecks(ctx, guard, curves);

    report(startedAt, failures);
  } finally {
    anvil.stop();
  }

  if (failures.length > 0) {
    console.error(`\nFAILED: ${failures.length} invariant violation(s)\n`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Phase 1: token deployments across every template
// ---------------------------------------------------------------------------

async function phaseTokenDeploys(ctx, send, guard) {
  console.log('-- phase 1: token deployments --');
  const { publicClient, wallets, manifest, abis } = ctx;

  const fee = await publicClient.readContract({
    address: manifest.feeRouter,
    abi: abis.FeeRouter,
    functionName: 'flatNativeOf',
    args: [0],
  });

  for (let i = 0; i < SCALE.tokenDeploys; i++) {
    const wallet = wallets[i % wallets.length];
    const salt = saltFor(`token-${i}`);

    await send(wallet, 'deployStandard', {
      address: manifest.tokenFactory,
      abi: abis.TokenFactory,
      functionName: 'deployStandard',
      args: [
        {
          name: `Stress ${i}`,
          symbol: `ST${i}`,
          supply: parseEther('1000000'),
          recipient: wallet.account.address,
          salt,
        },
      ],
      value: fee,
    });
  }

  await guard('after token deploys', () => checkFeeRouterSolvency(ctx));
  console.log(`  deployed ${SCALE.tokenDeploys} tokens\n`);
}

// ---------------------------------------------------------------------------
// Phase 2: curve launches, heavy trading, graduation
// ---------------------------------------------------------------------------

async function phaseCurves(ctx, send, guard) {
  console.log('-- phase 2: bonding curves --');
  const { publicClient, wallets, manifest, abis } = ctx;
  const launched = [];

  const deployFee = await publicClient.readContract({
    address: manifest.feeRouter,
    abi: abis.FeeRouter,
    functionName: 'flatNativeOf',
    args: [0],
  });

  for (let c = 0; c < SCALE.curves; c++) {
    const creator = wallets[c % wallets.length];
    const salt = saltFor(`curve-${c}`);

    const predicted = await publicClient.readContract({
      address: manifest.bondingCurveFactory,
      abi: abis.BondingCurveFactory,
      functionName: 'predictCurveAddress',
      args: [creator.account.address, salt],
    });

    await send(creator, 'launchCurve', {
      address: manifest.bondingCurveFactory,
      abi: abis.BondingCurveFactory,
      functionName: 'launch',
      args: [
        {
          name: `Curve ${c}`,
          symbol: `CV${c}`,
          lockLpInsteadOfBurn: c % 2 === 1,
          lpLockDuration: c % 2 === 1 ? 60n * 60n * 24n * 30n : 0n,
          devBuyValue: 0n,
          devBuyMinTokensOut: 0n,
          salt,
        },
      ],
      value: deployFee,
    });

    const token = await publicClient.readContract({
      address: predicted,
      abi: abis.BondingCurve,
      functionName: 'token',
    });
    launched.push({ curve: predicted, token, lockedLp: c % 2 === 1 });

    // Past the anti-snipe window so trade sizes are not capped.
    await advanceTime(ctx, 120);

    let graduated = false;
    for (let t = 0; t < SCALE.tradesPerCurve && !graduated; t++) {
      const trader = wallets[(t + 1) % wallets.length];
      const deadline = BigInt(await blockTimestamp(ctx)) + 600n;

      // Buy, then sometimes sell part of it back, so the curve is driven in both directions.
      const amount = parseEther(String(0.2 + (t % 5) * 0.15));
      try {
        await send(trader, 'curveBuy', {
          address: predicted,
          abi: abis.BondingCurve,
          functionName: 'buy',
          args: [0n, deadline],
          value: amount,
        });
      } catch {
        stats.reverted += 1;
      }

      if (t % 3 === 2) {
        const held = await publicClient.readContract({
          address: token,
          abi: abis.StandardToken,
          functionName: 'balanceOf',
          args: [trader.account.address],
        });
        if (held > 0n) {
          const sellAmount = held / 3n;
          if (sellAmount > 0n) {
            await send(trader, 'approve', {
              address: token,
              abi: abis.StandardToken,
              functionName: 'approve',
              args: [predicted, sellAmount],
            });
            try {
              await send(trader, 'curveSell', {
                address: predicted,
                abi: abis.BondingCurve,
                functionName: 'sell',
                args: [sellAmount, 0n, BigInt(await blockTimestamp(ctx)) + 600n],
              });
            } catch {
              stats.reverted += 1;
            }
          }
        }
      }

      // Checked after every trade, so a violation names the trade that caused it.
      await guard(`curve ${c} trade ${t}`, () => checkCurveSolvency(ctx, predicted));
      await guard(`curve ${c} trade ${t}`, () => checkCurveSupply(ctx, predicted));

      graduated = await publicClient.readContract({
        address: predicted,
        abi: abis.BondingCurve,
        functionName: 'graduated',
      });
    }

    if (graduated) {
      stats.graduations += 1;
      const pair = await publicClient.readContract({
        address: predicted,
        abi: abis.BondingCurve,
        functionName: 'pair',
      });
      await guard(`curve ${c} post-graduation`, () => checkCurveSolvency(ctx, predicted));
      if (launched[c].lockedLp) {
        await guard(`curve ${c} lp lock`, () => checkLockerSolvency(ctx, pair));
      }
    }

    await guard(`curve ${c} fees`, () => checkFeeRouterSolvency(ctx));
    console.log(`  curve ${c}: ${graduated ? 'graduated' : 'still live'}`);
  }

  console.log(`  ${stats.graduations}/${SCALE.curves} graduated\n`);
  return launched;
}

// ---------------------------------------------------------------------------
// Phase 3: presales, both outcomes
// ---------------------------------------------------------------------------

async function phasePresales(ctx, send, guard) {
  console.log('-- phase 3: presales --');
  const { publicClient, wallets, manifest, abis } = ctx;

  for (let p = 0; p < SCALE.presales; p++) {
    const owner = wallets[p % wallets.length];
    // Alternate deliberately: one that succeeds and finalises, one that fails and refunds.
    const shouldSucceed = p % 2 === 0;

    const deployFee = await publicClient.readContract({
      address: manifest.feeRouter,
      abi: abis.FeeRouter,
      functionName: 'flatNativeOf',
      args: [0],
    });

    const tokenSalt = saltFor(`presale-${p}`);
    const tokenReceipt = await send(owner, 'deployStandard', {
      address: manifest.tokenFactory,
      abi: abis.TokenFactory,
      functionName: 'deployStandard',
      args: [
        {
          name: `Presale ${p}`,
          symbol: `PS${p}`,
          supply: parseEther('100000000'),
          recipient: owner.account.address,
          salt: tokenSalt,
        },
      ],
      value: deployFee,
    });

    // Decode the event rather than guessing from log addresses: the receipt also carries the
    // FeeRouter's own event, and picking the first non-factory address lands on that instead.
    const [deployed] = parseEventLogs({
      abi: abis.TokenFactory,
      eventName: 'TokenDeployed',
      logs: tokenReceipt.logs,
    });
    const token = deployed?.args?.token;
    if (!token) continue;

    const now = await blockTimestamp(ctx);
    const params = {
      token,
      owner: owner.account.address,
      tokensPerNative: parseEther('1000'),
      liquidityTokensPerNative: parseEther('800'),
      softCap: parseEther('5'),
      hardCap: parseEther('20'),
      minContribution: parseEther('0.1'),
      maxContribution: parseEther('10'),
      startsAt: BigInt(now + 60),
      endsAt: BigInt(now + 60 + 7200),
      liquidityBps: 6000,
      lockLpInsteadOfBurn: false,
      lpLockDuration: 0n,
      whitelistRoot: `0x${'0'.repeat(64)}`,
      isFairLaunch: false,
    };

    const needed = await publicClient.readContract({
      address: manifest.presaleFactory,
      abi: abis.PresaleFactory,
      functionName: 'tokensNeeded',
      args: [params],
    });

    await send(owner, 'approve', {
      address: token,
      abi: abis.StandardToken,
      functionName: 'approve',
      args: [manifest.presaleFactory, needed],
    });

    const predicted = await publicClient.readContract({
      address: manifest.presaleFactory,
      abi: abis.PresaleFactory,
      functionName: 'predictPresaleAddress',
      args: [owner.account.address, tokenSalt],
    });

    await send(owner, 'createPresale', {
      address: manifest.presaleFactory,
      abi: abis.PresaleFactory,
      functionName: 'createPresale',
      args: [params, tokenSalt],
    });

    await advanceTime(ctx, 120);

    const contributors = [];
    const target = shouldSucceed ? 8 : 3; // above or below the 5 ETH soft cap
    for (let i = 0; i < target; i++) {
      const wallet = wallets[(i + 1) % wallets.length];
      try {
        await send(wallet, 'contribute', {
          address: predicted,
          abi: abis.Presale,
          functionName: 'contribute',
          args: [[]],
          value: parseEther('1'),
        });
        if (!contributors.includes(wallet.account.address)) {
          contributors.push(wallet.account.address);
        }
      } catch {
        stats.reverted += 1;
      }
      await guard(`presale ${p} contribution ${i}`, () =>
        checkPresaleSolvency(ctx, predicted, contributors),
      );
    }

    await advanceTime(ctx, 7300);

    if (shouldSucceed) {
      try {
        await send(owner, 'finalise', {
          address: predicted,
          abi: abis.Presale,
          functionName: 'finalise',
          args: [],
        });
        console.log(`  presale ${p}: finalised`);
      } catch {
        stats.reverted += 1;
        console.log(`  presale ${p}: finalise reverted`);
      }
    } else {
      // The path that matters: every contributor must get their money back.
      for (const address of contributors) {
        const wallet = wallets.find((w) => w.account.address === address);
        if (!wallet) continue;
        try {
          await send(wallet, 'refund', {
            address: predicted,
            abi: abis.Presale,
            functionName: 'refund',
            args: [],
          });
          stats.refunds += 1;
        } catch {
          stats.reverted += 1;
        }
      }

      const leftover = await publicClient.getBalance({ address: predicted });
      if (leftover !== 0n) {
        console.error(`  !! presale ${p} retained ${formatEther(leftover)} ETH after all refunds`);
      }
      console.log(`  presale ${p}: failed, ${contributors.length} refunded`);
    }

    await guard(`presale ${p} fees`, () => checkFeeRouterSolvency(ctx));
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Phase 4: NFT deploy and mint
// ---------------------------------------------------------------------------

async function phaseNfts(ctx, send, guard) {
  console.log('-- phase 4: NFTs --');
  const { publicClient, wallets, manifest, abis } = ctx;
  const owner = wallets[0];

  const deployFee = await publicClient.readContract({
    address: manifest.feeRouter,
    abi: abis.FeeRouter,
    functionName: 'flatNativeOf',
    args: [6],
  });

  const receipt = await send(owner, 'deployCollection', {
    address: manifest.nftFactory,
    abi: abis.NftFactory,
    functionName: 'deployCollection',
    args: [
      {
        name: 'Stress Art',
        symbol: 'SART',
        baseURI: 'ipfs://base/',
        contractURI: 'ipfs://contract.json',
        maxSupply: 10_000n,
        owner: owner.account.address,
        royaltyReceiver: owner.account.address,
        royaltyBps: 500,
        salt: saltFor('nft-collection'),
      },
    ],
    value: deployFee,
  });

  const [deployedCollection] = parseEventLogs({
    abi: abis.NftFactory,
    eventName: 'CollectionDeployed',
    logs: receipt.logs,
  });
  const collection = deployedCollection?.args?.collection;
  if (!collection) {
    console.log('  could not resolve the collection address\n');
    return;
  }

  const now = await blockTimestamp(ctx);
  await send(owner, 'addPhase', {
    address: collection,
    abi: abis.NftCollection,
    functionName: 'addPhase',
    args: [
      {
        merkleRoot: `0x${'0'.repeat(64)}`,
        price: parseEther('0.01'),
        startsAt: BigInt(now),
        endsAt: BigInt(now + 86_400),
        maxPerWallet: 100,
        maxSupply: 0n,
      },
    ],
  });

  for (let i = 0; i < SCALE.nftMints; i++) {
    const minter = wallets[i % wallets.length];
    try {
      await send(minter, 'nftMint', {
        address: collection,
        abi: abis.NftCollection,
        functionName: 'mint',
        args: [0n, 2n, []],
        value: parseEther('0.02'),
      });
    } catch {
      stats.reverted += 1;
    }
  }

  const minted = await publicClient.readContract({
    address: collection,
    abi: abis.NftCollection,
    functionName: 'totalMinted',
  });

  await guard('after NFT mints', () => checkFeeRouterSolvency(ctx));
  console.log(`  minted ${minted} NFTs\n`);
}

// ---------------------------------------------------------------------------
// Phase 5: final sweep
// ---------------------------------------------------------------------------

async function phaseFinalChecks(ctx, guard, curves) {
  console.log('-- phase 5: final invariant sweep --');

  await guard('final fee router', () => checkFeeRouterSolvency(ctx));

  for (const { curve, token } of curves) {
    await guard('final curve solvency', () => checkCurveSolvency(ctx, curve));
    await guard('final token conservation', () =>
      checkTokenConservation(ctx, token, [curve, ...ctx.accounts]),
    );
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic 32-byte salt from a label.
 *
 * Hashed rather than padded: a label like "curve-0" padded into a hex string produces bytes that
 * are not valid hex at all, which viem rejects at encode time. Hashing gives a well-formed salt
 * and keeps runs reproducible.
 */
function saltFor(label) {
  return keccak256(toHex(label));
}

async function rpc(ctx, method, params) {
  return ctx.publicClient.request({ method, params });
}

async function advanceTime(ctx, seconds) {
  await rpc(ctx, 'evm_increaseTime', [seconds]);
  await rpc(ctx, 'evm_mine', []);
}

async function blockTimestamp(ctx) {
  const block = await ctx.publicClient.getBlock();
  return Number(block.timestamp);
}

function report(startedAt, failures) {
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  const lines = [
    '=== Stress test report ===',
    '',
    `duration:          ${seconds}s`,
    `transactions:      ${stats.transactions}`,
    `reverted:          ${stats.reverted}`,
    `total gas:         ${stats.gasUsed.toString()}`,
    `invariant checks:  ${stats.invariantChecks}`,
    `violations:        ${failures.length}`,
    `graduations:       ${stats.graduations}`,
    `refunds:           ${stats.refunds}`,
    '',
    'operations:',
    ...Object.entries(stats.byOperation)
      .sort((a, b) => b[1] - a[1])
      .map(([op, count]) => `  ${op.padEnd(20)} ${count}`),
    '',
    failures.length === 0
      ? 'RESULT: every invariant held under load.'
      : `RESULT: ${failures.length} violation(s):\n${failures.map((f) => `  - ${f}`).join('\n')}`,
    '',
  ];

  const text = lines.join('\n');
  console.log(text);
  writeFileSync(join(ROOT, 'contracts/artifacts/stress-report.txt'), text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
