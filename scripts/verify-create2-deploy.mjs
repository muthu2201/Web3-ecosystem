#!/usr/bin/env node
// Replay a CREATE2 deployment plan against a fork of the real target chain and prove the result
// is the ecosystem `Deploy.s.sol` would have produced.
//
// This is the gate in front of spending real funds from a wallet we cannot dry-run directly: the
// bytes sent here are byte-for-byte the bytes the wallet will send, so anything that would revert
// on-chain reverts here first, for free.
//
// Usage: FORK_RPC_URL=... SAFE_ADDRESS=... DEX_ROUTER=... node scripts/verify-create2-deploy.mjs

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  createTestClient, createPublicClient, http, publicActions, walletActions,
  parseEther, formatEther, getAddress, parseAbi, encodeFunctionData, toFunctionSelector,
} from 'viem';
import { buildPlan, CREATE2_DEPLOYER } from './plan-create2-deploy.mjs';

const FORK = process.env.FORK_RPC_URL ?? 'https://sepolia.base.org';
const PORT = Number(process.env.ANVIL_PORT ?? 8546);
const RPC = `http://127.0.0.1:${PORT}`;
// Two throwaway fork-only addresses. Every transaction below is sent by impersonation, so no
// private key is needed, held, or asked for anywhere in this pipeline.
const DEPLOYER = '0x00000000000000000000000000000000DEb10Ae4';
const SMOKE_USER = '0x000000000000000000000000000000000000c0FE';

const ZERO = '0x0000000000000000000000000000000000000000';
// All-zero arguments: `initialize` rejects them long before it would read them, because the
// constructor already latched the initialised flag. That is exactly what we are proving.
const CURVE_ZERO_INIT = [[ZERO, ZERO, 0n, 0n, 0n, 0n, 0n, 0n, false, 0n]];
const PRESALE_ZERO_INIT = [[ZERO, ZERO, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0, false, 0n, `0x${'00'.repeat(32)}`, false]];

const fail = (m) => { console.error(`FAIL  ${m}`); process.exitCode = 1; };
const ok = (m) => console.log(`ok    ${m}`);

function eq(label, actual, expected) {
  const a = String(actual).toLowerCase();
  const e = String(expected).toLowerCase();
  if (a === e) ok(`${label} = ${expected}`);
  else fail(`${label}: expected ${expected}, got ${actual}`);
}

async function startAnvil() {
  const anvil = spawn(`${process.env.HOME}/.foundry/bin/anvil`, [
    '--fork-url', FORK, '--port', String(PORT), '--silent', '--no-rate-limit',
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    try {
      const r = await fetch(RPC, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (r.ok) return anvil;
    } catch { /* not up yet */ }
  }
  anvil.kill();
  throw new Error(`anvil did not come up against ${FORK}`);
}

async function main() {
  const safe = getAddress(process.env.SAFE_ADDRESS ?? (() => { throw new Error('SAFE_ADDRESS required'); })());
  const dexRouter = getAddress(process.env.DEX_ROUTER ?? (() => { throw new Error('DEX_ROUTER required'); })());
  const plan = buildPlan({
    safe, dexRouter,
    flatNativeHardCap: BigInt(process.env.FLAT_NATIVE_HARD_CAP ?? parseEther('0.01')),
    timelockDelay: BigInt(process.env.TIMELOCK_DELAY ?? 48n * 60n * 60n),
  });

  console.log(`forking ${FORK} ...`);
  const anvil = await startAnvil();
  try {
    const test = createTestClient({ mode: 'anvil', transport: http(RPC) })
      .extend(publicActions).extend(walletActions);
    const pub = createPublicClient({ transport: http(RPC) });

    const chainId = await pub.getChainId();
    ok(`forked chain id ${chainId}`);

    const deployerCode = await pub.getCode({ address: CREATE2_DEPLOYER });
    if (!deployerCode || deployerCode === '0x') { fail('CREATE2 deployer is not on this chain'); return; }
    ok('CREATE2 deployer present');

    // ---- phase A: the 17 CREATE2 deployments, sent by an ordinary funded account --------------
    const sender = getAddress(DEPLOYER);
    await test.setBalance({ address: sender, value: parseEther('10') });
    await test.impersonateAccount({ address: sender });
    let gasA = 0n;
    for (const step of plan.steps) {
      const hash = await test.sendTransaction({
        account: sender, chain: null, to: step.to, data: step.data, value: 0n, gas: 8_000_000n,
      });
      const rcpt = await pub.waitForTransactionReceipt({ hash });
      if (rcpt.status !== 'success') { fail(`${step.contract}: deployment reverted`); return; }
      gasA += rcpt.gasUsed;
      const code = await pub.getCode({ address: step.address });
      if (!code || code === '0x') { fail(`${step.contract}: no code at predicted ${step.address}`); return; }
      const size = (code.length - 2) / 2;
      if (size > 24576) { fail(`${step.contract}: ${size} bytes exceeds the EIP-170 limit`); return; }
      ok(`${step.contract.padEnd(24)} ${step.address}  ${String(size).padStart(5)} bytes  gas ${rcpt.gasUsed}`);
    }
    await test.stopImpersonatingAccount({ address: sender });
    console.log(`\nphase A total gas: ${gasA}\n`);

    // ---- phase B: the three one-way bindings, sent by the owner ------------------------------
    await test.setBalance({ address: safe, value: parseEther('10') });
    await test.impersonateAccount({ address: safe });
    let gasB = 0n;
    for (const b of plan.bindings) {
      const hash = await test.sendTransaction({ account: safe, chain: null, to: b.to, data: b.data, value: 0n, gas: 2_000_000n });
      const rcpt = await pub.waitForTransactionReceipt({ hash });
      if (rcpt.status !== 'success') { fail(`${b.label} reverted`); return; }
      gasB += rcpt.gasUsed;
      ok(`${b.label} (gas ${rcpt.gasUsed})`);
    }
    await test.stopImpersonatingAccount({ address: safe });
    console.log(`\nphase B total gas: ${gasB}\ntotal gas: ${gasA + gasB}\n`);

    // ---- wiring assertions: every immutable and every binding --------------------------------
    const a = plan.addresses;
    const read = (address, sig, args = []) =>
      pub.readContract({ address, abi: parseAbi([sig]), functionName: sig.slice(9, sig.indexOf('(')), args });

    eq('FeeRouter.owner', await read(a.FeeRouter, 'function owner() view returns (address)'), safe);
    eq('FeeRouter.treasury', await read(a.FeeRouter, 'function treasury() view returns (address)'), safe);
    eq('FeeRouter.timelockDelay', await read(a.FeeRouter, 'function timelockDelay() view returns (uint64)'), 172800n);
    for (let product = 0; product < 6; product++) {
      const fee = await read(a.FeeRouter, 'function feeOn(uint8,uint256) view returns (uint256)', [product, parseEther('1')]);
      if (fee === 0n) ok(`FeeRouter.feeOn(product ${product}) starts at zero`);
      else fail(`FeeRouter.feeOn(product ${product}) = ${fee}, expected 0 at launch`);
    }

    eq('TokenFactory.owner', await read(a.TokenFactory, 'function owner() view returns (address)'), safe);
    eq('TokenFactory.feeRouter', await read(a.TokenFactory, 'function feeRouter() view returns (address)'), a.FeeRouter);
    eq('TokenFactory.deployersBound', await read(a.TokenFactory, 'function deployersBound() view returns (bool)'), true);
    const templates = ['Standard', 'Mintable', 'Pausable', 'Governance', 'Tax', 'Compliance'];
    for (let t = 0; t < 6; t++) {
      eq(`TokenFactory.deployerFor(${templates[t]})`,
        await read(a.TokenFactory, 'function deployerFor(uint8) view returns (address)', [t]),
        a[`${templates[t]}TokenDeployer`]);
    }

    eq('BondingCurveFactory.owner', await read(a.BondingCurveFactory, 'function owner() view returns (address)'), safe);
    eq('BondingCurveFactory.curveImplementation',
      await read(a.BondingCurveFactory, 'function curveImplementation() view returns (address)'), a.BondingCurve);
    eq('PresaleFactory.owner', await read(a.PresaleFactory, 'function owner() view returns (address)'), safe);
    eq('PresaleFactory.presaleImplementation',
      await read(a.PresaleFactory, 'function presaleImplementation() view returns (address)'), a.Presale);
    eq('NftFactory.owner', await read(a.NftFactory, 'function owner() view returns (address)'), safe);

    eq('BondingCurve.factory', await read(a.BondingCurve, 'function factory() view returns (address)'), a.BondingCurveFactory);
    eq('BondingCurve.locker', await read(a.BondingCurve, 'function locker() view returns (address)'), a.LiquidityLocker);
    eq('BondingCurve.dexRouter', await read(a.BondingCurve, 'function dexRouter() view returns (address)'), dexRouter);
    eq('Presale.factory', await read(a.Presale, 'function factory() view returns (address)'), a.PresaleFactory);
    eq('Presale.locker', await read(a.Presale, 'function locker() view returns (address)'), a.LiquidityLocker);

    // The implementations must be dead on arrival: their constructors set the initialised flag, so
    // `initialize` has to revert with AlreadyInitialized - not merely revert for some other reason.
    const ALREADY_INITIALIZED = toFunctionSelector('AlreadyInitialized()');
    for (const [impl, sig, args] of [
      ['BondingCurve',
       'function initialize((address,address,uint256,uint256,uint256,uint256,uint64,uint256,bool,uint64))',
       CURVE_ZERO_INIT],
      ['Presale',
       'function initialize((address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint64,uint64,uint16,bool,uint64,bytes32,bool))',
       PRESALE_ZERO_INIT],
    ]) {
      let outcome = 'succeeded';
      try {
        await pub.call({ to: a[impl], data: encodeFunctionData({ abi: parseAbi([sig]), args }) });
      } catch (e) {
        const raw = JSON.stringify(e.walk?.() ?? e, Object.getOwnPropertyNames(e.cause ?? e));
        outcome = (raw.match(/0x[0-9a-fA-F]{8}/) ?? ['reverted without data'])[0];
      }
      if (outcome.toLowerCase() === ALREADY_INITIALIZED.toLowerCase()) {
        ok(`${impl} implementation is permanently non-initialisable`);
      } else {
        fail(`${impl}.initialize should revert AlreadyInitialized (${ALREADY_INITIALIZED}); got ${outcome}`);
      }
    }

    // The one-way bindings must be one-way.
    await test.setBalance({ address: safe, value: parseEther('10') });
    await test.impersonateAccount({ address: safe });
    for (const [label, to, data] of [
      ['setCurveImplementation', a.BondingCurveFactory, plan.bindings[0].data],
      ['setPresaleImplementation', a.PresaleFactory, plan.bindings[1].data],
      ['bindDeployers', a.TokenFactory, plan.bindings[2].data],
    ]) {
      let reverted = false;
      try { await pub.call({ account: safe, to, data }); } catch { reverted = true; }
      if (reverted) ok(`${label} cannot be called twice`);
      else fail(`${label} is re-callable - the binding is not one-way`);
    }
    await test.stopImpersonatingAccount({ address: safe });

    // ---- live smoke: deploy a token and launch a curve through the CREATE2-placed factories ---
    const user = getAddress(SMOKE_USER);
    await test.setBalance({ address: user, value: parseEther('100') });
    await test.impersonateAccount({ address: user });

    const tokenHash = await test.sendTransaction({
      account: user,
      chain: null,
      to: a.TokenFactory,
      data: encodeFunctionData({
        abi: parseAbi(['function deployStandard((string,string,uint256,address,bytes32)) payable returns (address)']),
        args: [['Smoke Token', 'SMOKE', parseEther('1000000'), user, `0x${'11'.repeat(32)}`]],
      }),
      gas: 4_000_000n,
    });
    const tokenRcpt = await pub.waitForTransactionReceipt({ hash: tokenHash });
    if (tokenRcpt.status !== 'success') fail('deployStandard reverted');
    else {
      const token = await read(a.TokenFactory, 'function tokensPaged(uint256,uint256) view returns (address[])', [0n, 1n]);
      const bal = await read(token[0], 'function balanceOf(address) view returns (uint256)', [user]);
      eq('deployed token supply landed with the recipient', bal, parseEther('1000000'));
      eq('TokenFactory recognises its own token',
        await read(a.TokenFactory, 'function isPlatformToken(address) view returns (bool)', [token[0]]), true);
    }

    const launchHash = await test.sendTransaction({
      account: user,
      chain: null,
      to: a.BondingCurveFactory,
      data: encodeFunctionData({
        abi: parseAbi(['function launch((string,string,bool,uint64,uint256,uint256,bytes32)) payable returns (address,address)']),
        args: [['Curve Token', 'CURVE', false, 0n, 0n, 0n, `0x${'22'.repeat(32)}`]],
      }),
      gas: 6_000_000n,
    });
    const launchRcpt = await pub.waitForTransactionReceipt({ hash: launchHash });
    if (launchRcpt.status !== 'success') { fail('curve launch reverted'); return; }
    ok(`curve launched (gas ${launchRcpt.gasUsed})`);

    const curves = await read(a.BondingCurveFactory, 'function curvesPaged(uint256,uint256) view returns (address[])', [0n, 1n]);
    const curve = curves[0];

    const buyHash = await test.sendTransaction({
      account: user,
      chain: null,
      to: curve, value: parseEther('0.1'), gas: 2_000_000n,
      data: encodeFunctionData({
        abi: parseAbi(['function buy(uint256,uint256) payable returns (uint256)']),
        args: [0n, BigInt(Math.floor(Date.now() / 1000) + 3600)],
      }),
    });
    const buyRcpt = await pub.waitForTransactionReceipt({ hash: buyHash });
    if (buyRcpt.status !== 'success') fail('curve buy reverted');
    else ok(`curve buy succeeded (gas ${buyRcpt.gasUsed})`);

    const curveToken = await read(curve, 'function token() view returns (address)');
    const held = await read(curveToken, 'function balanceOf(address) view returns (uint256)', [user]);
    if (held > 0n) ok(`buyer received ${formatEther(held)} tokens from the curve`);
    else fail('buyer received no tokens');
    await test.stopImpersonatingAccount({ address: user });

    console.log(`\n${process.exitCode ? 'VERIFICATION FAILED' : 'Verification passed - the plan is safe to broadcast.'}`);
  } finally {
    anvil.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
