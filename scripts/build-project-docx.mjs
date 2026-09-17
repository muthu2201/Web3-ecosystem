#!/usr/bin/env node
// Build the single-file project document from the same facts the repository documents carry.
//
// `docx` is not a dependency of this monorepo on purpose - it is needed once, to produce a file
// for reading outside the repository, and adding it to the workspace would put a document
// generator in the dependency graph of a contracts project. Run it from a scratch directory:
//
//   mkdir -p /tmp/docxbuild && cd /tmp/docxbuild && npm install docx
//   node <path to this script> <output path>

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak,
} from 'docx';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'project.docx';

// ---------------------------------------------------------------------------------------------
// palette + helpers
// ---------------------------------------------------------------------------------------------
const INK = '1A1A1A';
const MUTED = '5A5A5A';
const ACCENT = '0B4F6C';
const RULE = 'D4D4D4';
const HEADER_BG = 'EEF2F4';

const PAGE_W = 9026; // A4 content width in DXA (11906 - 2x1440 margin)

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 140, line: opts.line ?? 276 },
    alignment: opts.align,
    indent: opts.indent,
    border: opts.border,
    children: [new TextRun({
      text,
      size: opts.size ?? 21,
      bold: opts.bold,
      italics: opts.italic,
      color: opts.color ?? INK,
      font: opts.font ?? 'Calibri',
    })],
  });
}

/** A paragraph mixing bold lead-in and body, so key terms scan without a heading. */
function runs(parts, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    indent: opts.indent,
    children: parts.map((x) => new TextRun({
      text: typeof x === 'string' ? x : x.t,
      bold: typeof x === 'string' ? false : x.b,
      italics: typeof x === 'string' ? false : x.i,
      font: (typeof x === 'object' && x.mono) ? 'Consolas' : 'Calibri',
      size: (typeof x === 'object' && x.mono) ? 18 : 21,
      color: (typeof x === 'object' && x.c) ? x.c : INK,
    })),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
    children: [new TextRun({ text, size: 30, bold: true, color: ACCENT, font: 'Calibri' })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, size: 24, bold: true, color: INK, font: 'Calibri' })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'dot', level },
    spacing: { after: 90, line: 276 },
    children: [new TextRun({ text, size: 21, color: INK, font: 'Calibri' })],
  });
}

function code(lines) {
  const arr = Array.isArray(lines) ? lines : [lines];
  // `break: 1` emits a real <w:br/>. A literal vertical tab would be passed through verbatim and
  // XML 1.0 forbids it, which silently produces a file Word and LibreOffice both refuse to open.
  const children = arr.map((line, i) => new TextRun({
    text: line, break: i > 0 ? 1 : undefined, size: 17, font: 'Consolas', color: INK,
  }));
  return new Paragraph({
    spacing: { before: 80, after: 140 },
    shading: { type: ShadingType.CLEAR, fill: 'F4F6F7' },
    indent: { left: 220, right: 220 },
    children,
  });
}

/** Pull-quote style callout for the things that must not be missed. */
function callout(text) {
  return new Paragraph({
    spacing: { before: 160, after: 200, line: 276 },
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
    children: [new TextRun({ text, size: 21, italics: true, color: INK, font: 'Calibri' })],
  });
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map((w) => Math.round((w / total) * PAGE_W));
  const cell = (text, { bold = false, head = false } = {}, i = 0) => new TableCell({
    width: { size: scaled[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: HEADER_BG } : undefined,
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    children: [new Paragraph({
      spacing: { after: 0, line: 252 },
      children: [new TextRun({ text, size: 19, bold: bold || head, color: head ? ACCENT : INK, font: 'Calibri' })],
    })],
  });
  return new Table({
    columnWidths: scaled,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((t, i) => cell(t, { head: true }, i)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(String(t), {}, i)) })),
    ],
  });
}

function spacer(after = 160) {
  return new Paragraph({ spacing: { after }, children: [] });
}

// ---------------------------------------------------------------------------------------------
// content
// ---------------------------------------------------------------------------------------------
const body = [];

// --- cover ---------------------------------------------------------------------------------
body.push(spacer(1800));
body.push(new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: 'NON-CUSTODIAL MULTI-CHAIN TOKEN ECOSYSTEM', size: 44, bold: true, color: ACCENT, font: 'Calibri' })],
}));
body.push(new Paragraph({
  spacing: { after: 320 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 10 } },
  children: [new TextRun({ text: 'Project documentation — design, decisions and deployment', size: 26, color: MUTED, font: 'Calibri' })],
}));
body.push(p('A token factory, bonding-curve launchpad, presale platform, NFT suite and swap interface, built so that no component ever holds user funds or signs on a user’s behalf.', { size: 22 }));
body.push(spacer(300));
body.push(table(
  ['', ''],
  [
    ['Repository', 'github.com/muthu2201/Web3-ecosystem'],
    ['Document date', '17 September 2026'],
    ['Status', 'Complete and tested; not yet deployed to any chain'],
    ['First deployment target', 'Base mainnet'],
    ['Audit', 'None — see Honest limitations'],
  ],
  [26, 74],
));
body.push(spacer(400));
body.push(p('This document is generated from the repository’s own documentation. When the two disagree, the repository is correct: README.md, CLAUDE.md and docs/ are maintained with the code, and this file is a snapshot for reading elsewhere.', { size: 19, color: MUTED, italic: true }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// --- 1. what this is -------------------------------------------------------------------------
body.push(h1('1. What this is'));
body.push(p('Five products sharing one set of contracts and one interface:'));
body.push(bullet('A token factory with six audited templates — standard, mintable, pausable, governance, tax and compliance.'));
body.push(bullet('A bonding-curve launchpad that accumulates native currency against a virtual-reserve price and graduates into a real DEX pool.'));
body.push(bullet('A presale and fair-launch platform with structural refunds.'));
body.push(bullet('An NFT collection factory with a signature-settled marketplace.'));
body.push(bullet('A swap interface that routes through an aggregator where one serves the chain, and a direct router where none does.'));
body.push(p('Built from a September 2026 technical blueprint, including its corrections: bonding-curve tokens are restricted to a single ownerless template, liquidity is added to real DEX pools rather than to an aggregator, and live curve pricing is computed client-side rather than indexed.'));

body.push(h2('The organising constraint'));
body.push(callout('No component may hold user funds or sign on a user’s behalf.'));
body.push(p('That is not a policy applied on top of a normal design. It decides the design. It is why there is no database, no backend service with a wallet, no custodial escrow, and no signing code anywhere outside the user’s own wallet.'));
body.push(p('It is also why the guarantees below are enforced in bytecode rather than in application logic. A promise a server keeps is a promise a server can break. The system is arranged so that someone who distrusts the operator can verify the important claims themselves, from chain state, without permission.'));
body.push(p('The US money-transmission cases the blueprint cites turn on custody and operational control over fund flow. This system is built to have neither, and arranged so that is checkable rather than merely asserted.'));

// --- 2. guarantees ---------------------------------------------------------------------------
body.push(h1('2. Guarantees enforced in bytecode'));
body.push(p('These are not policies. There is no code path that could violate them.'));
body.push(table(
  ['Guarantee', 'What makes it structural'],
  [
    ['Fees cannot exceed their published ceiling', 'maxBps is pure with no setter; the flat-fee ceiling is immutable. Raising a fee below the ceiling is timelocked; lowering one is immediate.'],
    ['A tax token’s rate can only fall', 'setTaxes reverts if either rate would rise, under an immutable per-deployment ceiling and a 10% compile-time constant. This removes the raise-the-sell-tax honeypot by construction.'],
    ['Locked liquidity cannot be released early', 'LiquidityLocker has no owner, no pause and no emergency path.'],
    ['A failed presale always refunds', 'refund is the only function that moves native currency out of a failed sale, and only to the contributor’s own deposit.'],
    ['A presale cannot open underfunded', 'Initialisation verifies the real token balance covers every buyer at the hard cap plus the liquidity allocation.'],
    ['Vested tokens cannot be clawed back', 'Revocation returns only the unvested remainder.'],
    ['The curve cannot be drained by rounding', 'Every settlement rounds in the pool’s favour. The property is fuzzed directly.'],
    ['The degen launcher cannot produce a rug', 'It only knows how to build StandardToken: fixed supply, ownerless, no mint, no tax, no pause, no blocklist.'],
  ],
  [33, 67],
));

body.push(h2('The two irreversible moments'));
body.push(p('Three bindings work exactly once each: setCurveImplementation, setPresaleImplementation and bindDeployers.'));
body.push(p('This is deliberate. A launchpad whose implementation could be swapped later is a launchpad whose guarantees are promises rather than facts — the operator could always replace the ownerless token template with one that has a mint function. Sealing them converts every guarantee above from a policy into a property.'));

// --- 3. how it is built ----------------------------------------------------------------------
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(h1('3. How it is built'));
body.push(p('Dependencies point downward only. The domain layer knows nothing about viem, HTTP or React; the ports layer declares what the outside world must provide; adapters provide it. Swapping a chart provider or a risk scanner is an adapter change, not a refactor.'));
body.push(code([
  'apps/web          static React bundle, no server of its own',
  'apps/edge         Cloudflare Worker: API-key custodian, rate limiter, cache',
  'apps/mcp          remote MCP server; returns unsigned transactions only',
  '       |',
  'packages/sdk      viem transaction builders over generated ABIs',
  'packages/adapters concrete implementations of the ports',
  'packages/ports    interfaces for every external dependency',
  'packages/chain-registry  chains, DEXes, capabilities, deployments',
  'packages/core     domain types, CAIP ids, curve and fee maths (bigint)',
  '       |',
  'contracts/        18 Solidity contracts - the only source of truth',
]));

body.push(h2('The contract layer'));
body.push(runs([{ t: 'FeeRouter', b: true }, ' — the only contract that accumulates protocol revenue. Its ceilings are compiled in, so "the fee cannot exceed its maximum" is a different and stronger statement than "we will not raise it".']));
body.push(runs([{ t: 'TokenFactory and six deployers', b: true }, ' — each template’s creation code lives in its own small deployer contract rather than in the factory. This is not abstraction for its own sake: an early TokenFactory reached 59,318 bytes, more than double the EIP-170 limit and undeployable on any chain, while passing every unit test, because Foundry raises the size limit inside tests. A real deployment caught it. CI now enforces the limit explicitly.']));
body.push(runs([{ t: 'BondingCurve and BondingCurveFactory', b: true }, ' — curves are EIP-1167 minimal clones of a single implementation fixed at deployment and never changeable. On graduation the curve creates a real DEX pool, seeds it, and makes the LP permanently unrecoverable.']));
body.push(runs([{ t: 'Presale', b: true }, ' — same clone pattern, with refunds and funding sufficiency both structural rather than procedural.']));
body.push(runs([{ t: 'LiquidityLocker, TokenVesting, MerkleDistributor', b: true }, ' — ownerless and permissionless. There is no privileged party to trust because there is no privileged party.']));
body.push(runs([{ t: 'NftCollection, NftFactory, NftMarketplace', b: true }, ' — the marketplace settles EIP-712 seller-signed listings and never takes custody of an NFT.']));

body.push(h2('The TypeScript layer'));
body.push(p('The domain package uses bigint throughout — no number ever touches a token amount, because 2^53 is smaller than a token balance and the failure is silent.'));
body.push(p('The curve maths is differential-tested against the Solidity library: 160 generated cases run through both implementations and must agree byte-for-byte. That is what lets the interface quote a price per keystroke, locally, without an RPC round trip, and still show the number the chain will produce.'));
body.push(p('Adapters degrade to an explicit "unknown" rather than a false all-clear. A risk scanner that silently returns "safe" when it is down is worse than no scanner at all.'));

body.push(h2('The interface'));
body.push(p('A static React bundle with no server of its own — thirteen routes, one per contract capability. Three properties hold on every one:'));
body.push(bullet('Nothing is read from a database. Listings, prices, risk flags and sale state all come from chain reads, which is why there is no backend to run and no cache to go stale.'));
body.push(bullet('Nothing is signed without a simulation of the exact payload. A failed simulation blocks signing rather than warning, and "could not be checked" is its own state, never shown as success.'));
body.push(bullet('Quotes are computed locally, from the differential-tested maths.'));

// --- 4. chains -------------------------------------------------------------------------------
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(h1('4. Chain support'));
body.push(p('Four chains are configured: two mainnets and two testnets. Nothing in the contracts is chain-specific — adding a fifth is a registry entry plus a deployment, not a code change, provided it clears the one hard constraint.'));
body.push(table(
  ['Chain', 'CAIP-2', 'Role', 'Default DEX'],
  [
    ['Base', 'eip155:8453', 'mainnet, first target', 'Uniswap V2'],
    ['BNB Smart Chain', 'eip155:56', 'mainnet', 'PancakeSwap V2'],
    ['Base Sepolia', 'eip155:84532', 'testnet', 'Uniswap V2'],
    ['BNB Chain Testnet', 'eip155:97', 'testnet', 'PancakeSwap V2'],
  ],
  [28, 20, 27, 25],
));

body.push(h2('The hard constraint: the DEX must be Uniswap V2-shaped'));
body.push(p('When a curve graduates it creates a pool, seeds it, and makes the liquidity permanently unrecoverable. The promise to a buyer is "this liquidity can never be pulled", and the promise has to be checkable by anyone with a single balanceOf call. That requires a factory answering the two-argument getPair(address,address), and a pool minting a fungible ERC-20 LP token.'));
body.push(p('Two families of DEX fail this, and both failures were verified against live chains rather than assumed:'));
body.push(runs([{ t: 'Solidly forks — Aerodrome, Velodrome. ', b: true }, 'Their factory exposes getPool(address,address,bool). The two-argument getPair reverts, and their pools mint no fungible LP token.']));
body.push(runs([{ t: 'Uniswap V3 and V4. ', b: true }, 'Their liquidity positions are ERC-721 NFTs. There is no balance to read, so "the LP was burned" cannot be established with one call. This is why the system targets V2 despite V4 being live — a deliberate trade of capital efficiency for a verifiable guarantee.']));

body.push(h2('What that choice costs'));
body.push(table(
  ['', 'Flagship V2 pool', 'TVL'],
  [
    ['Base / Uniswap V2', 'WETH–USDC', '~$1.25M'],
    ['BNB / PancakeSwap V2', 'WBNB–USDT', '~$76.6M'],
  ],
  [34, 33, 33],
));
body.push(p('Base’s genuine liquidity lives on Aerodrome and Uniswap V3/V4 — the venues this architecture cannot use. On BNB Chain, PancakeSwap V2 was never displaced and remains a primary venue, so a token graduating there lands in far deeper water. That is not an argument against Base, which has the better distribution funnel, but it is a real trade-off to revisit if graduation depth becomes a complaint.'));

body.push(h2('Deployment cost per chain'));
body.push(p('Measured 17 September 2026 at ETH $2,449.57 and BNB $727.43, against 31,516,881 gas for a full deployment and 3,752,657 for one curve launch.'));
body.push(table(
  ['Chain', 'Full deployment', 'Per token launch'],
  [
    ['Optimism', '$0.08', '$0.0092'],
    ['Base', '$0.54', '$0.0643'],
    ['BNB Chain', '$1.15', '$0.1365'],
    ['Arbitrum', '$1.85', '$0.2206'],
    ['Ethereum', '$12.78', '$1.5214'],
  ],
  [36, 32, 32],
));
body.push(p('L2 base fees swing hour to hour; treat the ordering among the L2s as noise and the gap to Ethereum as structural. Ethereum is deliberately absent from the registry: at roughly 24× Base’s cost it makes the launch products uneconomic for the users they target.'));

// --- 5. deployment ---------------------------------------------------------------------------
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(h1('5. Deployment design'));
body.push(p('Deployment does not use forge script, because that needs a raw private key on the command line and the owner key is the most privileged secret in the project. Instead the whole deployment is expressed as plain transactions any wallet can send, split into two phases with completely different trust requirements.'));
body.push(table(
  ['', 'Phase A', 'Phase B'],
  [
    ['What', '17 contract deployments', '3 one-way bindings'],
    ['Signed by', 'an ephemeral gas payer', 'the real owner wallet'],
    ['Authority granted to the signer', 'none', 'all of it'],
    ['Reversible', 'yes — redeploy under a new salt', 'no'],
  ],
  [30, 36, 34],
));
body.push(p('Phase A grants nothing. Every owner, treasury and admin arrives as a constructor argument, so the account paying that gas owns none of what it deploys and can be a throwaway holding a few cents. Phase B is three calls that must come from the owner, each irreversible once it lands.'));

body.push(h2('Why CREATE2'));
body.push(p('Every contract is placed through the canonical deterministic deployer, which turns a contract creation — an operation with no destination address — into an ordinary call with calldata that any wallet can send. The consequences shape the whole runbook:'));
body.push(bullet('Addresses are known before deployment. They depend only on the salt and the init code, never on the sender or its nonce.'));
body.push(bullet('The work can be split across any number of transactions, batches, wallets or days without a single address moving.'));
body.push(bullet('Resumption is free. An address either has code or it does not, so an interrupted run picks up where it stopped with no state to track.'));
body.push(bullet('The same contracts land at the same addresses on every chain where the constructor arguments match. BondingCurve and Presale are the exceptions by design, because they embed the DEX router.'));

body.push(h2('The gate in front of spending real funds'));
body.push(p('Before anything is broadcast, the plan is replayed against a fork of the real target chain using byte-for-byte the calldata the wallet will send, and the resulting state is asserted:'));
body.push(bullet('All 17 contracts have code at their predicted addresses, each within the EIP-170 limit.'));
body.push(bullet('Every owner and treasury resolves to the configured address; every product fee starts at zero.'));
body.push(bullet('Both clone implementations are permanently non-initialisable — initialize must revert with AlreadyInitialized specifically, not merely revert.'));
body.push(bullet('All three bindings take, then refuse to be called a second time.'));
body.push(bullet('A real token deploys, a curve launches, and a buy on that curve succeeds.'));
body.push(p('The last group matters most: it asserts the contracts work, not merely that they have code. The full run passes against a fork of Base mainnet.'));

body.push(h2('Standing rules'));
body.push(bullet('Never accept a private key from the operator, and never ask for one. Gas is paid by an ephemeral key generated for that run and destroyed after.'));
body.push(bullet('Never skip the fork verification. It is free and it sends the same bytes.'));
body.push(bullet('Never rush phase B. Phase A is recoverable for the price of another deployment. Phase B is not recoverable at all.'));

// --- 6. history ------------------------------------------------------------------------------
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(h1('6. Decisions, and the evidence behind them'));
body.push(p('Most of the surprising choices here were forced by something measured against a live chain. Without the measurement they read as arbitrary and get undone, so the measurement is recorded with each one. The repository keeps the full log in docs/DECISIONS.md; these are the ones that changed the shape of the project.'));

body.push(h2('The Aerodrome graduation defect'));
body.push(p('Aerodrome was originally the default DEX on Base. It has far deeper liquidity, and the reasoning was sound in the abstract. Verified against live Base, it was broken:'));
body.push(code([
  'Uniswap V2 factory  getPair(a, b)         -> address',
  'Aerodrome factory   getPair(a, b)         -> execution reverted',
  'Aerodrome factory   getPool(a, b, false)  -> address',
]));
body.push(callout('Every graduation on Base would have reverted with the entire raise sitting in the contract — and no test could have caught it, because the tests run against a mock DEX that answers correctly.'));
body.push(p('The fix was a supportsV2PoolCreation flag per DEX, a defaultDex() that filters on it and throws rather than falling back to the first entry, and 21 tests pinning the invariant. Aerodrome stays listed with the flag false, usable for routing and quotes, structurally unable to be chosen for graduation. The flag rather than a deletion, because the failure mode to design against is a future contributor adding a DEX and assuming it works.'));

body.push(h2('A test suite that was quietly not running'));
body.push(p('The artifacts directory was gitignored, and the cheatcode that writes fixtures cannot create parent directories. On a fresh clone, fixture generation failed and 126 of 292 tests — every differential and integration test — did not run. The suite reported success on what remained.'));
body.push(p('The lesson is not about .gitignore. It is that a test suite reporting green is evidence only if you know what it ran.'));

body.push(h2('The wallet was not what it appeared to be'));
body.push(p('The treasury address was initially diagnosed as a counterfactual smart account, because a batched call failed with "account not deployed" and the address had no code on the testnet. That diagnosis came from reasoning about an error message. Reading the account’s code on Base mainnet gave the real answer:'));
body.push(code('0xef01007702cb554e6bfb442cb743a7df23154544a7176c'));
body.push(p('The 0xef0100 prefix is an EIP-7702 delegation. The address is an ordinary EOA that has delegated to a smart-wallet implementation. A plain send went through on the first attempt. A 7702 EOA is in fact a better treasury owner than a contract account: it exists at the same address on every chain with no per-chain deployment step.'));
body.push(callout('Two of this project’s worst moments came from asserting something that sounded right instead of reading the chain. Both were fixed in one call.'));

body.push(h2('Abandoning the public testnet'));
body.push(p('Base Sepolia proved unreachable in practice. The operator’s wallet signer refuses the chain outright — not a settings toggle, the chain is not served — and every Base Sepolia faucet gates on holding a mainnet ETH balance. Coinbase’s faucet is discontinued; QuickNode’s states no minimum is required but its form rejects with "Invalid ETH mainnet balance".'));
body.push(p('The arithmetic settled it: a faucet asks you to hold about $2.45 to unlock it, while the entire Base mainnet deployment spends about $0.55. The toll exceeds the destination. What replaces the rehearsal is the mainnet-fork verification, which tests strictly more than Base Sepolia would, because Sepolia’s DEX has no real liquidity behind it.'));

body.push(h2('Smaller ones'));
body.push(table(
  ['Decision', 'Why'],
  [
    ['Foundry pinned to v1.5.1', 'An unpinned "stable" drifted mid-project and produced 107 lint findings with no source change. That backlog has since been worked off; lint now reports three notes, none in production logic.'],
    ['Coverage runs with --ir-minimum', 'forge coverage disables via_ir, which puts this codebase over the stack limit. The size gate is excluded from coverage because --ir-minimum changes the bytecode, making size measurements meaningless there; the limit is still enforced on the real build.'],
    ['Mock isolation enforced by a build script', 'A check fails the build if production Solidity imports from test/ or names a mock. Verified by planting a violation. The local-chain script is the single recorded exemption.'],
    ['Dependabot not enabled', 'An upgrade here has to clear the whole gate — isolation, frozen-lockfile install, 13 typecheck targets, 300 TypeScript tests, 185 contract tests, and a responsive re-audit of 13 routes. A stream of single-dependency bot PRs cannot clear that gate individually. Security alerts stay on and are acted on by hand.'],
    ['One branch', 'An earlier attempt at a second branch for tests and features produced exactly the merge conflicts it was meant to avoid.'],
  ],
  [26, 74],
));

// --- 7. testing ------------------------------------------------------------------------------
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(h1('7. Testing'));
body.push(p('Four layers, each catching what the others cannot.'));
body.push(runs([{ t: 'Unit and fuzz', b: true }, ' — known scenarios plus property-based edge cases. The curve’s rounding invariants are fuzzed directly, because a rounding bug there is a drain vector rather than a cosmetic error.']));
body.push(runs([{ t: 'Stateful invariant suites', b: true }, ' — properties that must hold after any call sequence the fuzzer can construct, checked against ghost ledgers maintained independently of contract storage. Solvency is verified against an external source of truth rather than the contract agreeing with itself. An afterInvariant hook asserts each campaign was substantive, so a change that makes one vacuous fails loudly instead of passing silently.']));
body.push(runs([{ t: 'Differential', b: true }, ' — 160 generated cases through both the Solidity curve library and its TypeScript port, requiring byte-exact equality.']));
body.push(runs([{ t: 'Integration and stress', b: true }, ' — against a real node. Not redundant with the unit layer: Foundry raises the code-size limit inside tests, which is exactly how an undeployable factory passed 182 unit tests.']));
body.push(spacer(120));
body.push(table(
  ['Suite', 'Result'],
  [
    ['Solidity', '185 tests passing (unit, fuzz, stateful invariant)'],
    ['TypeScript', '300 tests across 9 files, passing'],
    ['Static analysis', 'Slither clean at medium severity and above'],
    ['Lint', 'forge lint: three notes, none in production logic'],
    ['Stress harness', '401 transactions, 110M gas, 432 invariant checks, zero violations'],
    ['CI', 'six jobs: contracts, slither, typescript, stress, secrets, supply-chain'],
  ],
  [28, 72],
));

// --- 8. status + limits ----------------------------------------------------------------------
body.push(h1('8. Status and what remains'));
body.push(table(
  ['Area', 'State'],
  [
    ['Contracts', '18 contracts, complete and tested'],
    ['TypeScript', '5 packages, 3 apps, complete and tested'],
    ['Interface', '13 routes, one per contract capability'],
    ['Deployment plan', 'Built and verified against a fork of Base mainnet'],
    ['Live deployment', 'Not yet on any chain'],
    ['Audit', 'None'],
  ],
  [30, 70],
));
body.push(h2('Immediate next steps'));
body.push(bullet('Fund an ephemeral gas payer on Base mainnet with roughly $1–2 of ETH.'));
body.push(bullet('Broadcast phase A; confirm all 17 contracts have code and every fee reads zero.'));
body.push(bullet('Sign the three bindings from the owner wallet.'));
body.push(bullet('Record the addresses, wire them into the interface, and deploy the site.'));
body.push(bullet('Drive one real launch end to end: token, curve, buy, graduation into a live pool.'));
body.push(bullet('Add BNB Chain for about $1.15 — same verified plan, no code change.'));

body.push(h1('9. Honest limitations'));
body.push(p('Read SECURITY.md and docs/THREAT_MODEL.md before deploying with real value.'));
body.push(runs([{ t: 'No paid audit. ', b: true }, 'Two contracts hold user funds. The testing here is strong for immutable standard logic and is not a substitute for professional review.']));
body.push(runs([{ t: 'Pre-seeded pools. ', b: true }, 'A well-funded attacker can mint LP into a curve’s pair before graduation. Mitigated and surfaced, not eliminated.']));
body.push(runs([{ t: 'Third-party liveness. ', b: true }, 'Charts, routing and storage each depend on an outside provider with its own terms and uptime. Port boundaries make them swappable; they do not make them reliable.']));
body.push(runs([{ t: 'Thin V2 liquidity on Base. ', b: true }, 'A consequence of the verifiable-burn requirement. If it hurts graduations, the fix is an Aerodrome path with a different permanence proof — a lock contract holding the position rather than a burn. That is real work, not configuration.']));
body.push(runs([{ t: 'Legal exposure. ', b: true }, 'The blueprint identifies India’s FIU-IND/PMLA regime and US money-transmission theory as the largest under-priced risks in the plan. Nothing in this repository addresses that, and no amount of code can. Engage counsel before launch.']));
body.push(spacer(300));
body.push(p('Licence: MIT for this repository’s own source. Vendored dependencies keep their own licences — OpenZeppelin Contracts (MIT), Solady (MIT), forge-std (MIT/Apache-2.0).', { size: 19, color: MUTED }));

// ---------------------------------------------------------------------------------------------
const doc = new Document({
  creator: 'Web3 Ecosystem',
  title: 'Non-Custodial Multi-Chain Token Ecosystem — Project Documentation',
  description: 'Design, decisions and deployment',
  numbering: {
    config: [{
      reference: 'dot',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 220 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 760, hanging: 220 } } } },
      ],
    }],
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: INK } },
    },
  },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: body,
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(OUT, buf);
console.log('wrote', OUT, buf.length, 'bytes');
