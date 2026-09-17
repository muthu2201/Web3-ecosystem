#!/usr/bin/env node
/**
 * Start Anvil, deploy the ecosystem, activate fees, and emit a manifest.
 *
 * Shared by the SDK integration tests and the stress harness so both exercise the same real
 * deployment rather than a hand-written fake. Anvil is a genuine EVM, so anything that passes
 * here passed against real bytecode, real gas accounting and real revert behaviour.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONTRACTS = join(ROOT, 'contracts');

/** Anvil's first default account. A well-known test key; never used outside a local node. */
export const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
export const TEST_ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

function foundryBin(name) {
  const local = join(homedir(), '.foundry', 'bin', name);
  return existsSync(local) ? local : name;
}

export async function startAnvil({ port = 8545 } = {}) {
  const proc = spawn(
    foundryBin('anvil'),
    ['--port', String(port), '--silent', '--gas-limit', '60000000'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const rpcUrl = `http://127.0.0.1:${port}`;
  await waitForRpc(rpcUrl, 30_000);

  return {
    rpcUrl,
    stop: () => {
      proc.kill('SIGTERM');
    },
  };
}

async function waitForRpc(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Anvil did not become ready at ${url} within ${timeoutMs}ms`);
}

function run(cmd, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}\n${stdout}\n${stderr}`));
    });
    proc.on('error', reject);
  });
}

/** Deploy the ecosystem and return the address manifest. */
export async function deployEcosystem(rpcUrl) {
  await run(
    foundryBin('forge'),
    [
      'script',
      'script/DeployLocal.s.sol',
      '--rpc-url',
      rpcUrl,
      '--broadcast',
      '--skip-simulation',
    ],
    { cwd: CONTRACTS, env: { ...process.env, PRIVATE_KEY: TEST_PRIVATE_KEY, PATH: process.env.PATH } },
  );

  const manifest = JSON.parse(
    readFileSync(join(CONTRACTS, 'artifacts/local-deployment.json'), 'utf8'),
  );

  // Fees were proposed by the deploy script; move past the timelock and execute them so the
  // integration tests run against a fee-charging system rather than a free one.
  await activateFees(rpcUrl, manifest.feeRouter);

  return manifest;
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method} failed: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function activateFees(rpcUrl, feeRouter) {
  // Past the 24h minimum timelock.
  await rpc(rpcUrl, 'evm_increaseTime', [25 * 60 * 60]);
  await rpc(rpcUrl, 'evm_mine', []);

  for (let product = 0; product <= 8; product++) {
    await run(
      foundryBin('cast'),
      [
        'send',
        feeRouter,
        'executeFeeConfig(uint8)',
        String(product),
        '--rpc-url',
        rpcUrl,
        '--private-key',
        TEST_PRIVATE_KEY,
      ],
      { cwd: CONTRACTS },
    );
  }
}

export { run, rpc };
