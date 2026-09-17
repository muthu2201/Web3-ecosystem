#!/usr/bin/env node
// Verify every deployed contract's source on a block explorer.
//
// Two reasons this is not optional. A launchpad asks strangers to trust that its bytecode does
// what its documentation claims; unverified bytecode makes that unknowable, so nobody should
// trust it. And a verified contract gets the explorer's Read/Write Contract tabs, which is how an
// owner signs a privileged call from an ordinary browser or a phone wallet — typed fields with
// named parameters instead of a blob of hex pasted from somewhere.
//
// Blockscout needs no API key, which is why it is the default. Etherscan/Basescan does; pass
// --verifier etherscan with ETHERSCAN_API_KEY set to publish there too, which is worth doing
// because it is the explorer most people check.
//
// Constructor arguments are not re-derived here. They are recovered from the deployment plan, by
// stripping the salt and the compiled creation code off the calldata that was actually broadcast,
// so what gets verified is what was deployed.
//
// Usage: node scripts/verify-on-explorer.mjs [--verifier blockscout|etherscan] [--only Name,Name]

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = join(ROOT, 'contracts');

/** Where each contract's source lives, for `forge verify-contract`'s path:name argument. */
const SOURCES = {
  FeeRouter: 'src/fees/FeeRouter.sol',
  LiquidityLocker: 'src/liquidity/LiquidityLocker.sol',
  TokenFactory: 'src/tokens/TokenFactory.sol',
  TokenVesting: 'src/distribution/TokenVesting.sol',
  MerkleDistributor: 'src/distribution/MerkleDistributor.sol',
  NftFactory: 'src/nft/NftFactory.sol',
  NftMarketplace: 'src/nft/NftMarketplace.sol',
  BondingCurveFactory: 'src/launch/BondingCurveFactory.sol',
  BondingCurve: 'src/launch/BondingCurve.sol',
  PresaleFactory: 'src/launch/PresaleFactory.sol',
  Presale: 'src/launch/Presale.sol',
  StandardTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
  MintableTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
  PausableTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
  GovernanceTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
  TaxTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
  ComplianceTokenDeployer: 'src/tokens/deployers/TokenDeployers.sol',
};

const VERIFIERS = {
  blockscout: { verifier: 'blockscout', url: 'https://base.blockscout.com/api/', needsKey: false },
  etherscan: { verifier: 'etherscan', url: undefined, needsKey: true },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const choice = arg('verifier', 'blockscout');
const target = VERIFIERS[choice];
if (!target) throw new Error(`unknown verifier "${choice}"; use blockscout or etherscan`);
if (target.needsKey && !process.env.ETHERSCAN_API_KEY) {
  throw new Error('ETHERSCAN_API_KEY is required for the etherscan verifier');
}

const chainId = arg('chain-id', '8453');
const only = arg('only', '').split(',').filter(Boolean);

const plan = JSON.parse(readFileSync(join(CONTRACTS, 'artifacts', 'create2-plan.json'), 'utf8'));

/**
 * Constructor arguments as actually broadcast: the plan's calldata is salt ++ creation code ++
 * args, so removing the first two leaves exactly the third.
 */
function constructorArgs(step) {
  const source = SOURCES[step.contract];
  const file = source.slice(source.lastIndexOf('/') + 1, -4);
  const artifact = JSON.parse(
    readFileSync(join(CONTRACTS, 'out', `${file}.sol`, `${step.contract}.json`), 'utf8'),
  );
  const creation = artifact.bytecode.object.slice(2);
  const initCode = step.data.slice(2 + 64); // drop "0x" and the 32-byte salt
  if (!initCode.startsWith(creation)) {
    throw new Error(`${step.contract}: compiled creation code no longer matches what was deployed`);
  }
  return initCode.slice(creation.length);
}

let done = 0;
let failed = 0;
for (const step of plan.steps) {
  if (only.length && !only.includes(step.contract)) continue;

  const args = constructorArgs(step);
  const argv = [
    'verify-contract', step.address, `${SOURCES[step.contract]}:${step.contract}`,
    '--chain-id', chainId,
    '--verifier', target.verifier,
    ...(target.url ? ['--verifier-url', target.url] : []),
    ...(args ? ['--constructor-args', `0x${args}`] : []),
    '--watch',
  ];

  process.stdout.write(`${step.contract.padEnd(24)} ${step.address} ... `);
  try {
    const out = execFileSync('forge', argv, {
      cwd: CONTRACTS,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // Blockscout ignores the key but forge insists one is present.
      env: { ...process.env, ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY ?? 'blockscout' },
    });
    const already = /already verified/i.test(out);
    console.log(already ? 'already verified' : 'verified');
    done += 1;
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    if (/already verified/i.test(text)) { console.log('already verified'); done += 1; }
    else { console.log('FAILED'); console.log(text.trim().split('\n').slice(-4).join('\n')); failed += 1; }
  }
}

console.log(`\n${done} verified, ${failed} failed`);
process.exit(failed ? 1 : 0);
