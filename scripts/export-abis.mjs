#!/usr/bin/env node
/**
 * Export ABIs and CREATE2 creation bytecode from the Foundry build into the SDK package.
 *
 * Generated rather than hand-maintained: a hand-copied ABI drifts from the contract the moment
 * someone adds a parameter, and the failure mode is an encoded call that reverts on-chain for
 * reasons no stack trace explains. Running this is part of the build, so the SDK cannot describe
 * a contract that is not the one in `contracts/src`.
 *
 * Creation bytecode is exported for the templates the factory deploys, because the UI computes
 * CREATE2 addresses locally to show a user their token's address before they sign.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'packages/sdk/src/generated');

/** Contracts whose ABI the SDK needs, mapped to their Foundry artifact path. */
const CONTRACTS = {
  FeeRouter: 'FeeRouter.sol/FeeRouter.json',
  TokenFactory: 'TokenFactory.sol/TokenFactory.json',
  StandardToken: 'StandardToken.sol/StandardToken.json',
  MintableToken: 'MintableToken.sol/MintableToken.json',
  PausableToken: 'PausableToken.sol/PausableToken.json',
  GovernanceToken: 'GovernanceToken.sol/GovernanceToken.json',
  TaxToken: 'TaxToken.sol/TaxToken.json',
  ComplianceToken: 'ComplianceToken.sol/ComplianceToken.json',
  BondingCurve: 'BondingCurve.sol/BondingCurve.json',
  BondingCurveFactory: 'BondingCurveFactory.sol/BondingCurveFactory.json',
  Presale: 'Presale.sol/Presale.json',
  PresaleFactory: 'PresaleFactory.sol/PresaleFactory.json',
  LiquidityLocker: 'LiquidityLocker.sol/LiquidityLocker.json',
  TokenVesting: 'TokenVesting.sol/TokenVesting.json',
  MerkleDistributor: 'MerkleDistributor.sol/MerkleDistributor.json',
  NftCollection: 'NftCollection.sol/NftCollection.json',
  NftFactory: 'NftFactory.sol/NftFactory.json',
  NftMarketplace: 'NftMarketplace.sol/NftMarketplace.json',
};

/** Templates whose creation bytecode the SDK needs for local CREATE2 address prediction. */
const NEEDS_BYTECODE = new Set([
  'StandardToken',
  'MintableToken',
  'PausableToken',
  'GovernanceToken',
  'TaxToken',
  'ComplianceToken',
  'NftCollection',
]);

mkdirSync(outDir, { recursive: true });

const header = `/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run \`pnpm contracts:abi\` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

`;

const index = [];

for (const [name, artifactPath] of Object.entries(CONTRACTS)) {
  const full = join(root, 'contracts/out', artifactPath);
  let artifact;
  try {
    artifact = JSON.parse(readFileSync(full, 'utf8'));
  } catch (err) {
    console.error(`Missing artifact for ${name} at ${full}. Run \`forge build\` first.`);
    process.exitCode = 1;
    continue;
  }

  const parts = [header];
  parts.push(`export const ${name}Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`);

  if (NEEDS_BYTECODE.has(name)) {
    const bytecode = artifact.bytecode?.object;
    if (!bytecode || bytecode === '0x') {
      console.error(`No creation bytecode for ${name}; CREATE2 prediction would be impossible.`);
      process.exitCode = 1;
    } else {
      parts.push(`\nexport const ${name}Bytecode = ${JSON.stringify(bytecode)} as \`0x\${string}\`;\n`);
    }
  }

  writeFileSync(join(outDir, `${name}.ts`), parts.join(''));
  index.push(`export * from './${name}.js';`);
}

writeFileSync(join(outDir, 'index.ts'), `${header}${index.join('\n')}\n`);

console.log(`Exported ${index.length} contract ABIs to packages/sdk/src/generated`);
