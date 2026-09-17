#!/usr/bin/env node
// Build a deterministic CREATE2 deployment plan for the whole ecosystem.
//
// Why this exists: the treasury/owner address on Base is a Coinbase Base Account - an ERC-4337
// smart account with no exportable private key. `forge script` needs a key, so it cannot drive
// that wallet. Every deployment here is therefore expressed as a plain `eth_call`-shaped
// transaction to the canonical CREATE2 deployer, which any wallet (smart or EOA) can send.
//
// The plan mirrors `contracts/script/Deploy.s.sol` exactly: same contracts, same constructor
// arguments, same dependency order. `verify-create2-deploy.mjs` replays this plan against a fork
// and asserts the resulting chain state matches what `Deploy.s.sol` produces.
//
// Addresses are deterministic: they depend only on the salt and the init code (which embeds the
// constructor arguments). Nothing depends on the sender or its nonce, so the plan can be split
// across as many transactions, batches or wallets as the sender likes without changing a single
// address.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  encodeAbiParameters,
  encodeFunctionData,
  getCreate2Address,
  keccak256,
  concat,
  toHex,
  isAddress,
  getAddress,
  parseEther,
} from 'viem';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'contracts', 'out');

/** Arachnid's deterministic deployment proxy, present on every chain we target. */
export const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

/** Namespaced so a future breaking change to the contracts gets fresh addresses. */
const SALT_NAMESPACE = 'web3-ecosystem:v1:';

const CURVE_CONFIG = {
  totalSupply: 1_000_000_000n * 10n ** 18n,
  curveSupply: 800_000_000n * 10n ** 18n,
  virtualNativeStart: parseEther('1.5'),
  virtualTokenStart: 1_073_000_000n * 10n ** 18n,
  antiSnipeWindow: 60n,
  maxBuyDuringWindow: parseEther('0.5'),
  devBuyCapBps: 2000n,
};

const CURVE_CONFIG_TUPLE = {
  type: 'tuple',
  components: [
    { name: 'totalSupply', type: 'uint256' },
    { name: 'curveSupply', type: 'uint256' },
    { name: 'virtualNativeStart', type: 'uint256' },
    { name: 'virtualTokenStart', type: 'uint256' },
    { name: 'antiSnipeWindow', type: 'uint64' },
    { name: 'maxBuyDuringWindow', type: 'uint256' },
    { name: 'devBuyCapBps', type: 'uint16' },
  ],
};

function creationCode(file, contract) {
  const path = join(OUT, `${file}.sol`, `${contract}.json`);
  let artifact;
  try {
    artifact = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`Missing artifact for ${contract}. Run \`forge build\` in contracts/ first (looked in ${path}).`);
  }
  const object = artifact?.bytecode?.object;
  if (typeof object !== 'string' || !object.startsWith('0x') || object.length <= 2) {
    throw new Error(`Artifact ${contract} has no creation bytecode - is it abstract or an interface?`);
  }
  if (object.includes('__$')) {
    throw new Error(`Artifact ${contract} has unlinked libraries; CREATE2 cannot place it as-is.`);
  }
  return object;
}

function saltFor(name) {
  return keccak256(toHex(`${SALT_NAMESPACE}${name}`));
}

/**
 * The deployment DAG. Each entry's `args` receives the addresses resolved so far, so the order
 * below is the same dependency order `Deploy.s.sol` uses.
 */
function dag(cfg) {
  const A = (t, v) => ({ type: t, value: v });
  return [
    { name: 'FeeRouter', file: 'FeeRouter', args: () => [
      A('address', cfg.safe), A('address', cfg.safe),
      A('uint256', cfg.flatNativeHardCap), A('uint64', cfg.timelockDelay),
    ] },
    { name: 'LiquidityLocker', file: 'LiquidityLocker', args: () => [] },
    { name: 'TokenFactory', file: 'TokenFactory', args: (a) => [
      A('address', cfg.safe), A('address', a.FeeRouter),
    ] },
    { name: 'TokenVesting', file: 'TokenVesting', args: () => [] },
    { name: 'MerkleDistributor', file: 'MerkleDistributor', args: () => [] },
    { name: 'NftFactory', file: 'NftFactory', args: (a) => [
      A('address', cfg.safe), A('address', a.FeeRouter),
    ] },
    { name: 'NftMarketplace', file: 'NftMarketplace', args: (a) => [A('address', a.FeeRouter)] },
    { name: 'BondingCurveFactory', file: 'BondingCurveFactory', args: (a) => [
      A('address', cfg.safe), A('address', a.FeeRouter), A(CURVE_CONFIG_TUPLE, CURVE_CONFIG),
    ] },
    { name: 'BondingCurve', file: 'BondingCurve', args: (a) => [
      A('address', a.BondingCurveFactory), A('address', a.FeeRouter),
      A('address', cfg.dexRouter), A('address', a.LiquidityLocker),
    ] },
    { name: 'PresaleFactory', file: 'PresaleFactory', args: (a) => [
      A('address', cfg.safe), A('address', a.FeeRouter),
    ] },
    { name: 'Presale', file: 'Presale', args: (a) => [
      A('address', a.PresaleFactory), A('address', a.FeeRouter),
      A('address', cfg.dexRouter), A('address', a.LiquidityLocker),
    ] },
    ...['Standard', 'Mintable', 'Pausable', 'Governance', 'Tax', 'Compliance'].map((t) => ({
      name: `${t}TokenDeployer`,
      file: 'TokenDeployers',
      args: (a) => [A('address', a.TokenFactory)],
    })),
  ];
}

/**
 * Guard against the plan and `Deploy.s.sol` drifting apart.
 *
 * The plan is a hand-written mirror of the Solidity deploy script. If someone adds a contract
 * there and forgets it here, the CREATE2 path would quietly ship a smaller ecosystem than the
 * tested one - and every audit, test and review would have been done against the other list. So
 * the two sets are compared on every run, from the Solidity source itself.
 */
function assertMirrorsDeployScript(planned) {
  const source = readFileSync(join(ROOT, 'contracts', 'script', 'Deploy.s.sol'), 'utf8')
    // Comments name contracts too; only real `new X(...)` expressions count.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const inScript = new Set([...source.matchAll(/\bnew\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]));
  const inPlan = new Set(planned);

  const missing = [...inScript].filter((n) => !inPlan.has(n));
  const extra = [...inPlan].filter((n) => !inScript.has(n));
  if (missing.length || extra.length) {
    throw new Error(
      'The CREATE2 plan no longer mirrors contracts/script/Deploy.s.sol.\n' +
      (missing.length ? `  deployed by the script but absent from the plan: ${missing.join(', ')}\n` : '') +
      (extra.length ? `  in the plan but not deployed by the script: ${extra.join(', ')}\n` : '') +
      '  Update dag() in this file so both deploy the same system.',
    );
  }
}

export function buildPlan(cfg) {
  for (const k of ['safe', 'dexRouter']) {
    if (!isAddress(cfg[k])) throw new Error(`${k} is not an address: ${cfg[k]}`);
  }
  const entries = dag(cfg);
  assertMirrorsDeployScript(entries.map((e) => e.name));

  const addresses = {};
  const steps = [];

  for (const entry of entries) {
    const spec = entry.args(addresses);
    const encodedArgs = spec.length
      ? encodeAbiParameters(spec.map((s) => (typeof s.type === 'string' ? { type: s.type } : s.type)),
          spec.map((s) => s.value))
      : '0x';
    const initCode = concat([creationCode(entry.file, entry.name), encodedArgs]);
    const salt = saltFor(entry.name);
    const address = getCreate2Address({ from: CREATE2_DEPLOYER, salt, bytecode: initCode });
    addresses[entry.name] = address;
    steps.push({
      kind: 'deploy',
      contract: entry.name,
      address,
      salt,
      to: getAddress(CREATE2_DEPLOYER),
      value: '0x0',
      // The canonical proxy reads the first 32 bytes as the salt and CREATE2s the rest.
      data: concat([salt, initCode]),
    });
  }

  const bindings = [
    {
      kind: 'bind',
      label: 'BondingCurveFactory.setCurveImplementation',
      to: addresses.BondingCurveFactory,
      value: '0x0',
      data: encodeFunctionData({
        abi: [{ name: 'setCurveImplementation', type: 'function', inputs: [{ type: 'address' }] }],
        args: [addresses.BondingCurve],
      }),
    },
    {
      kind: 'bind',
      label: 'PresaleFactory.setPresaleImplementation',
      to: addresses.PresaleFactory,
      value: '0x0',
      data: encodeFunctionData({
        abi: [{ name: 'setPresaleImplementation', type: 'function', inputs: [{ type: 'address' }] }],
        args: [addresses.Presale],
      }),
    },
    {
      kind: 'bind',
      label: 'TokenFactory.bindDeployers',
      to: addresses.TokenFactory,
      value: '0x0',
      data: encodeFunctionData({
        abi: [{
          name: 'bindDeployers', type: 'function',
          inputs: Array.from({ length: 6 }, () => ({ type: 'address' })),
        }],
        args: [
          addresses.StandardTokenDeployer, addresses.MintableTokenDeployer,
          addresses.PausableTokenDeployer, addresses.GovernanceTokenDeployer,
          addresses.TaxTokenDeployer, addresses.ComplianceTokenDeployer,
        ],
      }),
    },
  ];

  return { config: { ...cfg, flatNativeHardCap: cfg.flatNativeHardCap.toString(), timelockDelay: cfg.timelockDelay.toString() }, addresses, steps, bindings };
}

function main() {
  const safe = process.env.SAFE_ADDRESS;
  const dexRouter = process.env.DEX_ROUTER;
  if (!safe || !dexRouter) {
    console.error('Set SAFE_ADDRESS and DEX_ROUTER. Optional: FLAT_NATIVE_HARD_CAP (wei), TIMELOCK_DELAY (seconds), OUT_FILE.');
    process.exit(2);
  }
  const plan = buildPlan({
    safe: getAddress(safe),
    dexRouter: getAddress(dexRouter),
    flatNativeHardCap: BigInt(process.env.FLAT_NATIVE_HARD_CAP ?? parseEther('0.01')),
    timelockDelay: BigInt(process.env.TIMELOCK_DELAY ?? 48n * 60n * 60n),
  });

  const outFile = process.env.OUT_FILE ?? join(ROOT, 'contracts', 'artifacts', 'create2-plan.json');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(plan, null, 2)}\n`);

  console.log('=== CREATE2 deployment plan ===');
  console.log('safe/treasury        ', plan.config.safe);
  console.log('dexRouter            ', plan.config.dexRouter);
  console.log('create2 deployer     ', CREATE2_DEPLOYER);
  console.log('');
  for (const s of plan.steps) console.log(s.contract.padEnd(24), s.address, `(${(s.data.length - 2) / 2} bytes calldata)`);
  console.log('');
  for (const b of plan.bindings) console.log('bind'.padEnd(24), b.label);
  console.log('');
  console.log('written to', outFile);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
