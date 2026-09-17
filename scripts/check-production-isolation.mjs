#!/usr/bin/env node
/**
 * Fail the build if test scaffolding can reach production code.
 *
 * Mocks exist so tests can run without a live DEX. They are useful and they are not the problem.
 * The problem is a mock drifting into something that gets deployed — a mock router accepted by
 * the production deploy script, a mock token imported by a contract in `src/`. Both are the kind
 * of mistake that looks harmless in review and is catastrophic on chain, so this is checked
 * mechanically rather than by discipline.
 *
 * Three rules:
 *   1. Nothing in `contracts/src/` may import from `test/` or name a mock.
 *   2. `Deploy.s.sol` — the production script — may not import from `test/`.
 *   3. `DeployLocal.s.sol` is exempt: it exists to stand up a local Anvil chain and deploying a
 *      mock DEX is its whole job. It is named so it cannot be mistaken for the real one.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = join(ROOT, 'contracts');

/** Scripts allowed to touch test scaffolding, with the reason recorded here rather than in a comment. */
const EXEMPT = new Map([
  ['script/DeployLocal.s.sol', 'stands up a local Anvil chain; deploying a mock DEX is its purpose'],
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.sol')) out.push(full);
  }
  return out;
}

const violations = [];

function check(files, label, { allowMockNames = false } = {}) {
  for (const file of files) {
    const rel = relative(CONTRACTS, file).split('\\').join('/');
    if (EXEMPT.has(rel)) continue;

    const source = readFileSync(file, 'utf8');
    for (const [i, line] of source.split('\n').entries()) {
      const isImport = line.trimStart().startsWith('import ');
      if (isImport && /["'][^"']*\/test\//.test(line)) {
        violations.push(`${rel}:${i + 1}  ${label} imports from test/: ${line.trim()}`);
      }
      if (isImport && !allowMockNames && /\bMock[A-Z]/.test(line)) {
        violations.push(`${rel}:${i + 1}  ${label} imports a mock: ${line.trim()}`);
      }
    }
  }
}

check(walk(join(CONTRACTS, 'src')), 'production contract');
check([join(CONTRACTS, 'script/Deploy.s.sol')], 'production deploy script');

if (violations.length > 0) {
  console.error('Test scaffolding has leaked into production code:\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\nMocks belong in contracts/test/. Nothing that ships may import them.');
  process.exit(1);
}

console.log('Production isolation OK:');
console.log('  contracts/src/**        no test imports, no mock imports');
console.log('  script/Deploy.s.sol     no test imports, no mock imports');
for (const [file, why] of EXEMPT) console.log(`  ${file.padEnd(23)} exempt - ${why}`);
