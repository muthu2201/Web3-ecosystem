#!/usr/bin/env node
// Broadcast the CREATE2 deployment plan's contract creations (phase A).
//
// Phase A places code. It grants nothing: every owner, treasury and admin in the ecosystem is
// passed in as a constructor argument, so the account that pays this gas owns none of it and can
// be a throwaway funded with a few cents. Phase B - the three irreversible bindings - is signed by
// the real owner wallet instead, which is why it is not here.
//
// Idempotent by construction: a CREATE2 address either has code or it does not, so a re-run after
// a dropped transaction or an exhausted balance resumes exactly where it stopped.
//
// Usage: RPC_URL=... DEPLOYER_KEY_FILE=... SAFE_ADDRESS=... DEX_ROUTER=... node scripts/broadcast-create2-deploy.mjs

import { readFileSync } from 'node:fs';
import {
  createPublicClient, createWalletClient, http, defineChain, formatEther, getAddress, parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { buildPlan } from './plan-create2-deploy.mjs';

const RPC = process.env.RPC_URL ?? 'https://sepolia.base.org';
const CONFIRM_TIMEOUT_MS = 180_000;
const CODE_POLL_ATTEMPTS = 20;
const CODE_POLL_INTERVAL_MS = 1_500;

/**
 * Read code at an address, tolerating a lagging node.
 *
 * Public RPC endpoints are load balanced. `waitForTransactionReceipt` can be answered by a node
 * that has the block while the very next `eth_getCode` lands on one that does not yet, which reads
 * as "the deployment produced no code" when the deployment was fine. Observed on Base mainnet: a
 * successful 1.34M-gas deployment reported empty, and the same address returned 5,581 bytes a few
 * seconds later. So poll rather than trusting a single read.
 */
async function waitForCode(pub, address) {
  for (let i = 0; i < CODE_POLL_ATTEMPTS; i++) {
    const code = await pub.getCode({ address }).catch(() => undefined);
    if (code && code !== '0x') return code;
    await new Promise((r) => setTimeout(r, CODE_POLL_INTERVAL_MS));
  }
  return undefined;
}

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function main() {
  const key = readFileSync(required('DEPLOYER_KEY_FILE'), 'utf8').trim();
  const account = privateKeyToAccount(key);

  const plan = buildPlan({
    safe: getAddress(required('SAFE_ADDRESS')),
    dexRouter: getAddress(required('DEX_ROUTER')),
    flatNativeHardCap: BigInt(process.env.FLAT_NATIVE_HARD_CAP ?? parseEther('0.01')),
    timelockDelay: BigInt(process.env.TIMELOCK_DELAY ?? 48n * 60n * 60n),
  });

  const pub = createPublicClient({ transport: http(RPC) });
  const chainId = await pub.getChainId();
  const chain = defineChain({
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  });
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });

  const startBalance = await pub.getBalance({ address: account.address });
  console.log(`rpc        ${RPC}`);
  console.log(`chain id   ${chainId}`);
  console.log(`gas payer  ${account.address}  (${formatEther(startBalance)} ETH)`);
  console.log(`owner      ${plan.config.safe}\n`);

  let sent = 0;
  let skipped = 0;
  for (const step of plan.steps) {
    const existing = await pub.getCode({ address: step.address });
    if (existing && existing !== '0x') {
      console.log(`skip   ${step.contract.padEnd(24)} ${step.address}  already deployed`);
      skipped += 1;
      continue;
    }

    // Estimating first means a step that would revert costs nothing and stops the run here,
    // rather than burning the gas budget on a transaction that cannot succeed.
    const gas = await pub.estimateGas({ account, to: step.to, data: step.data, value: 0n });
    const hash = await wallet.sendTransaction({
      to: step.to,
      data: step.data,
      value: 0n,
      gas: (gas * 125n) / 100n,
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash, timeout: CONFIRM_TIMEOUT_MS });
    if (rcpt.status !== 'success') throw new Error(`${step.contract}: transaction ${hash} reverted`);

    const code = await waitForCode(pub, step.address);
    if (!code) {
      throw new Error(
        `${step.contract}: no code at ${step.address} after ${hash}, still absent ` +
        `${(CODE_POLL_ATTEMPTS * CODE_POLL_INTERVAL_MS) / 1000}s later. The transaction succeeded, ` +
        'so re-run to resume - a genuinely missing contract will simply be redeployed.',
      );
    }

    console.log(`ok     ${step.contract.padEnd(24)} ${step.address}  gas ${rcpt.gasUsed}  ${hash}`);
    sent += 1;
  }

  const endBalance = await pub.getBalance({ address: account.address });
  console.log(`\n${sent} deployed, ${skipped} already present`);
  console.log(`spent      ${formatEther(startBalance - endBalance)} ETH`);
  console.log(`remaining  ${formatEther(endBalance)} ETH`);
  console.log('\nPhase B (the three one-way bindings) must be signed by the owner wallet:');
  for (const b of plan.bindings) console.log(`  ${b.label}\n    to   ${b.to}\n    data ${b.data}`);
}

main().catch((e) => {
  console.error(`\n${e.message ?? e}`);
  process.exit(1);
});
