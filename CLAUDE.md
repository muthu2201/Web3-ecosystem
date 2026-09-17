# Project context for Claude

Read this first in any new session. It is the handover note: what this is, what has been decided
and why, what is done, and the rules that apply to work here.

## What this is

A non-custodial, multi-chain token ecosystem: a token factory with six audited templates, a
bonding-curve launchpad that graduates into a real DEX pool, a presale/fair-launch platform, an
NFT collection factory with signature-settled marketplace, a liquidity locker, vesting and Merkle
distribution, and a swap interface. Built from a September 2026 technical blueprint.

The defining constraint: **no component ever holds user funds or signs on a user's behalf.** Every
value-moving action is a transaction the user signs in their own wallet. The backend is an API-key
proxy and a cache. The MCP server returns unsigned transactions and has no submission path.

## Where to read more

| Document | Covers |
|---|---|
| [README.md](README.md) | Guarantees enforced in bytecode, repository layout, how to run everything |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The whole system, layer by layer, and why each layer exists |
| [docs/CHAINS.md](docs/CHAINS.md) | Chain support, the DEX compatibility constraint, how to add a chain |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | The deployment runbook, phase by phase |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Every consequential decision, with the evidence behind it |
| [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) | Attacker capabilities and what stops each one |
| [SECURITY.md](SECURITY.md) | Audit status and disclosure |

`docs/DECISIONS.md` is the one to read before arguing with an existing choice. Most of the
surprising ones were forced by evidence gathered against live chains, and the evidence is recorded
there.

## Current state

- **Contracts**: 18 contracts, 185 Solidity tests (unit, fuzz, stateful invariant) all passing.
  Slither clean at medium severity and above. `forge lint` reports three notes, none in production
  logic.
- **TypeScript**: 5 packages, 3 apps, 300 tests across 9 files, all passing. Includes differential
  tests that run the TypeScript curve math against the Solidity implementation's own fixtures.
- **CI**: six jobs — contracts, slither, typescript, stress, secrets, supply-chain.
- **Deployment**: not yet live on any chain. The plan is built, and verified end to end against a
  fork of Base mainnet. Base mainnet is the first target.
- **Audit**: none. See SECURITY.md.

## Standing rules for work in this repository

**Document decisions here, not only in chat.** A conversation ends; the repository does not. When
you make a consequential choice — a dependency, an architecture change, a rejected alternative —
add it to `docs/DECISIONS.md` with the evidence. When behaviour changes, update the document that
describes that behaviour in the same commit. This file and the `docs/` tree are the memory that
survives a new session.

**Never accept a private key from the user, and never ask for one.** The user supplies addresses.
Deployment gas is paid by an ephemeral key generated locally for that run, which owns nothing
because every owner and treasury is a constructor argument. See `docs/DEPLOYMENT.md`.

**Verify against a fork before broadcasting.** `scripts/verify-create2-deploy.mjs` replays the
exact calldata that will be sent, against a fork of the real target chain, and asserts the
resulting state. Anything that would revert on-chain reverts there first, for free.

**Mocks never reach production code.** `scripts/check-production-isolation.mjs` fails the build if
`contracts/src/` or `Deploy.s.sol` imports from `test/` or names a mock. `DeployLocal.s.sol` is the
single recorded exemption, because standing up a local chain is its purpose.

**One branch.** Work goes to `main`. The user asked explicitly for a single production branch to
avoid merge conflicts between parallel lines of work.

**Check the claim before making it.** Several bugs in this project's history came from asserting
something that sounded right rather than reading the chain. Two live examples are in
`docs/DECISIONS.md` — the Aerodrome graduation defect and the EIP-7702 wallet misdiagnosis. Both
were found by making a call instead of reasoning from memory.

## Running things

```bash
# Solidity
cd contracts && forge build && forge test

# TypeScript (the root owns the whole workspace suite; packages have no test script)
pnpm vitest run

# Full local chain with a mock DEX, for integration tests
node scripts/local-chain.mjs

# Deployment plan and its fork verification
SAFE_ADDRESS=0x… DEX_ROUTER=0x… node scripts/plan-create2-deploy.mjs
SAFE_ADDRESS=0x… DEX_ROUTER=0x… FORK_RPC_URL=… node scripts/verify-create2-deploy.mjs
```

Foundry is pinned to v1.5.1 — see `docs/DECISIONS.md` for why an unpinned `stable` caused trouble.

## Conventions

- Solidity 0.8.30, `via_ir = true`. Contracts must stay under the EIP-170 24,576-byte limit;
  `CodeSizeTest` enforces it.
- TypeScript uses `bigint` for every on-chain quantity. No `number` for token amounts, ever.
- Chains are identified by CAIP-2, accounts by CAIP-10, assets by CAIP-19.
- Comments explain *why*, not *what*. The code already says what it does.
