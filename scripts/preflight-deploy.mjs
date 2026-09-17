#!/usr/bin/env node
/**
 * Verify a deployment target against the live chain before any gas is spent.
 *
 * This exists because of a defect that reached `main`: the chain registry named Aerodrome as
 * Base's DEX, and the contracts call a two-argument `getPair(address,address)` that Aerodrome's
 * factory does not expose. Nothing in the test suite could catch it — Anvil ran against a mock
 * DEX that answered correctly. The failure would have surfaced at the first graduation, with a
 * launch's entire raise already sitting in the contract.
 *
 * So every assumption the deploy script makes about the outside world is checked here against
 * the real chain first. It reads only; it never signs and never broadcasts.
 *
 * Usage:
 *   RPC_URL=... DEPLOYER=0x... SAFE_ADDRESS=0x... DEX_ROUTER=0x... \
 *     node scripts/preflight-deploy.mjs
 */

import {
  createPublicClient,
  http,
  formatEther,
  getAddress,
  decodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
} from 'viem';

const RPC_URL = process.env.RPC_URL;
const DEPLOYER = process.env.DEPLOYER;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const DEX_ROUTER = process.env.DEX_ROUTER;
const EXPECTED_CHAIN_ID = process.env.EXPECTED_CHAIN_ID;
/** Deploying the full ecosystem has measured at roughly 25M gas. */
const GAS_BUDGET = BigInt(process.env.GAS_BUDGET ?? 25_000_000);

const problems = [];
const warnings = [];
const notes = [];

function need(name, value) {
  if (!value) {
    problems.push(`${name} is not set`);
    return null;
  }
  try {
    return getAddress(value);
  } catch {
    problems.push(`${name} is not a valid address: ${value}`);
    return null;
  }
}

if (!RPC_URL) problems.push('RPC_URL is not set');
const deployer = need('DEPLOYER', DEPLOYER);
const safe = need('SAFE_ADDRESS', SAFE_ADDRESS);
const router = need('DEX_ROUTER', DEX_ROUTER);

if (problems.length > 0) {
  console.error('Cannot run preflight:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(2);
}

const client = createPublicClient({ transport: http(RPC_URL) });

const SELECTOR = {
  // getPair(address,address) — the two-argument form the contracts call. A Solidly fork
  // (Aerodrome, Velodrome) exposes getPool(address,address,bool) instead and reverts on this.
  getPair: '0xe6a43905',
  factory: '0xc45a0155',
  weth: '0xad5c4648',
};

const pad = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0');

async function callOrNull(to, data) {
  try {
    const result = await client.call({ to, data });
    return result.data ?? '0x';
  } catch {
    return null; // reverted, or the function does not exist
  }
}

function asAddress(raw) {
  if (!raw || raw === '0x') return null;
  try {
    return decodeAbiParameters(parseAbiParameters('address'), raw)[0];
  } catch {
    return null;
  }
}

async function hasCode(address) {
  const code = await client.getCode({ address });
  return Boolean(code && code !== '0x');
}

console.log('Preflight against', RPC_URL.replace(/\/v2\/.*/, '/v2/<key>'));
console.log();

// ---------------------------------------------------------------------------
// Chain identity
// ---------------------------------------------------------------------------
const chainId = await client.getChainId();
console.log(`  chain id                 ${chainId}`);
if (EXPECTED_CHAIN_ID && String(chainId) !== String(EXPECTED_CHAIN_ID)) {
  problems.push(
    `RPC reports chain ${chainId} but EXPECTED_CHAIN_ID is ${EXPECTED_CHAIN_ID}. ` +
      'Deploying against the wrong chain is not recoverable.',
  );
}

// ---------------------------------------------------------------------------
// Deployer can pay for the deployment
// ---------------------------------------------------------------------------
const balance = await client.getBalance({ address: deployer });
const gasPrice = await client.getGasPrice();
const estimatedCost = gasPrice * GAS_BUDGET;

console.log(`  deployer                 ${deployer}`);
console.log(`  deployer balance         ${formatEther(balance)}`);
console.log(`  gas price                ${formatEther(gasPrice)} (${gasPrice} wei)`);
console.log(`  estimated deploy cost    ${formatEther(estimatedCost)} at ${GAS_BUDGET} gas`);

if (balance === 0n) {
  problems.push('Deployer has a zero balance and cannot pay for anything.');
} else if (balance < estimatedCost) {
  problems.push(
    `Deployer balance ${formatEther(balance)} is below the estimated deploy cost ` +
      `${formatEther(estimatedCost)}. A deployment that runs out of gas part-way leaves a ` +
      'half-wired system: factories deployed but never bound to their implementations.',
  );
} else if (balance < estimatedCost * 2n) {
  warnings.push(
    'Deployer balance covers the estimate but leaves little margin. Gas can spike between ' +
      'this check and the broadcast.',
  );
}

// ---------------------------------------------------------------------------
// Owner / treasury
// ---------------------------------------------------------------------------
console.log(`  safe (owner, treasury)   ${safe}`);
if (await hasCode(safe)) {
  notes.push('SAFE_ADDRESS is a contract, consistent with a Safe multisig.');
} else {
  warnings.push(
    'SAFE_ADDRESS has no code, so it is an externally owned account rather than a multisig. ' +
      'It will own the fee router and every factory, and hold all protocol fees. A single key ' +
      'holding that authority is the risk a Safe exists to remove.',
  );
}

// ---------------------------------------------------------------------------
// DEX: the check that would have caught the Aerodrome defect
// ---------------------------------------------------------------------------
console.log(`  dex router               ${router}`);
if (!(await hasCode(router))) {
  problems.push(`DEX_ROUTER ${router} has no code on chain ${chainId}.`);
} else {
  const factory = asAddress(await callOrNull(router, SELECTOR.factory));
  const weth = asAddress(await callOrNull(router, SELECTOR.weth));

  if (!factory) {
    problems.push(
      'Router does not answer factory(). That is not a Uniswap-V2-compatible router, and the ' +
        'contracts will not be able to create a pair through it.',
    );
  } else {
    console.log(`  router.factory()         ${factory}`);
    if (!(await hasCode(factory))) {
      problems.push(`Router reports factory ${factory}, but that address has no code.`);
    } else {
      // The decisive check. A Solidly fork reverts here.
      const probe = await callOrNull(factory, SELECTOR.getPair + pad(factory) + pad(factory));
      if (probe === null) {
        problems.push(
          `Factory ${factory} reverts on getPair(address,address). This is a Solidly-style ` +
            'fork (Aerodrome, Velodrome) exposing getPool(address,address,bool) instead. Every ' +
            'bonding-curve graduation and every presale finalisation would revert on this DEX, ' +
            "at the moment a launch's entire raise is held by the contract.",
        );
      } else {
        notes.push('Factory answers the two-argument getPair the contracts call.');
      }
    }
  }

  if (!weth) {
    problems.push('Router does not answer WETH(); cannot confirm the wrapped-native token.');
  } else {
    console.log(`  router.WETH()            ${weth}`);
    if (!(await hasCode(weth))) {
      problems.push(`Router reports WETH ${weth}, but that address has no code.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------
console.log();
for (const n of notes) console.log('  ok       ' + n);
for (const w of warnings) console.log('  WARNING  ' + w);
for (const p of problems) console.log('  BLOCKER  ' + p);
console.log();

if (problems.length > 0) {
  console.error(`Preflight failed: ${problems.length} blocker(s). Do not deploy.`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? `Preflight passed with ${warnings.length} warning(s). Read them before deploying.`
    : 'Preflight passed. Safe to deploy.',
);
