# Architecture

How the system is built, layer by layer, and why each layer exists. The README describes what the
product does; this describes how it is put together. [DECISIONS.md](DECISIONS.md) records why the
contested choices went the way they did.

## The organising constraint

One requirement shapes everything: **no component may hold user funds or sign on a user's behalf.**

That is not a policy applied on top of a normal design — it decides the design. It is why there is
no database, no backend service with a wallet, no custodial escrow, and no signing code anywhere
outside the user's own wallet. It is also why the guarantees are enforced in bytecode rather than
in application logic: a promise a server keeps is a promise a server can break.

The system is arranged so that this is **checkable rather than asserted**. Someone who distrusts
the operator can verify the important claims themselves, from chain state, without permission.

## Layers

```
apps/web          static React bundle, no server of its own
apps/edge         Cloudflare Worker: API-key custodian, rate limiter, cache
apps/mcp          remote MCP server; returns unsigned transactions only
       │
packages/sdk      viem transaction builders over generated ABIs
packages/adapters concrete implementations of the ports
packages/ports    interfaces for every external dependency
packages/chain-registry  chains, DEXes, capabilities, deployments
packages/core     domain types, CAIP ids, curve and fee maths (bigint)
       │
contracts/        18 Solidity contracts — the only source of truth
```

Dependencies point downward only. `core` knows nothing about viem, HTTP, or React; `ports` declares
what the outside world must provide; `adapters` provides it. Swapping a chart provider or a risk
scanner is an adapter change, not a refactor.

## The contract layer

Eighteen contracts. The ones that matter most:

**`FeeRouter`** — the only contract that accumulates protocol revenue. Its ceilings are compiled
in: `maxBps` is `pure` with no setter, and the flat-fee ceiling is `immutable`. Raising a fee
within the ceiling is timelocked; lowering one is immediate. There is no code path by which a fee
can exceed its published maximum, which is a different and stronger statement than "we will not
raise it."

**`TokenFactory` and six deployers** — `Standard`, `Mintable`, `Pausable`, `Governance`, `Tax`,
`Compliance`. Each template's creation code lives in its own tiny deployer contract rather than in
the factory, because a single factory carrying all six exceeded the EIP-170 limit. This is not an
abstraction for its own sake: an early `TokenFactory` reached 59,318 bytes — more than double the
limit and undeployable on any chain — while passing every unit test, because Foundry raises the
size limit inside tests. A deployment caught it; CI now enforces the limit explicitly.

The deployers are bound once, irreversibly, via `bindDeployers`.

**`BondingCurve` and `BondingCurveFactory`** — the launchpad. Curves are EIP-1167 minimal clones
of a single implementation fixed at deployment and never changeable. The curve accumulates native
currency against a virtual-reserve pricing model, and on graduation creates a real DEX pool, seeds
it, and makes the LP permanently unrecoverable — burned to `0x…dEaD` or locked.

The launcher only knows how to build `StandardToken`: fixed supply, ownerless, no mint, no tax, no
pause, no blocklist. **The degen launcher cannot produce a rug**, because it has no code that could
build a token capable of one.

Every settlement rounds in the pool's favour, so rounding cannot drain the curve. That property is
fuzzed directly, because a rounding bug there is a drain vector rather than a cosmetic error.

**`Presale`** — same clone pattern. Two properties are structural rather than procedural: a failed
presale always refunds, because `refund` is the only function that moves native currency out of a
failed sale and only to the contributor's own deposit; and a presale cannot open underfunded,
because initialisation verifies the real token balance covers every buyer at the hard cap plus the
liquidity allocation.

**`LiquidityLocker`** — no owner, no pause, no emergency path. Locked liquidity cannot be released
early because there is no function that could.

**`TokenVesting`, `MerkleDistributor`** — ownerless and permissionless. Revocation returns only the
unvested remainder, so vested tokens cannot be clawed back.

**`NftCollection`, `NftFactory`, `NftMarketplace`** — the marketplace settles EIP-712
seller-signed listings; it never takes custody of an NFT.

### The two irreversible moments

`setCurveImplementation`, `setPresaleImplementation` and `bindDeployers` each work exactly once.
This is deliberate. A launchpad whose implementation could be swapped later is a launchpad whose
guarantees are promises rather than facts — the operator could always replace the ownerless token
template with one that has a mint function. Sealing them converts every guarantee above from a
policy into a property.

## The TypeScript layer

**`packages/core`** holds the domain: CAIP-2/10/19 identifiers, curve maths, fee maths, risk types.
`bigint` throughout — no `number` ever touches a token amount, because 2^53 is smaller than a
token balance and the failure is silent.

The curve maths is **differential-tested against the Solidity library**: 160 generated cases run
through both implementations and must agree byte-for-byte. This is what allows the interface to
quote a price per keystroke, locally, without an RPC round trip, and still show the number the
chain will produce.

**`packages/ports`** declares interfaces for every external dependency — quotes, risk scanning,
charts, storage, verification, simulation. **`packages/adapters`** implements them against 0x,
GoPlus, GeckoTerminal, Etherscan V2 and IPFS. Adapters degrade to an explicit "unknown" rather than
a false all-clear, which matters: a risk scanner that silently returns "safe" when it is down is
worse than no scanner.

**`packages/chain-registry`** is covered in [CHAINS.md](CHAINS.md).

**`packages/sdk`** builds transactions with viem over ABIs generated from the compiled contracts,
with one adapter per contract family: `curve`, `presale`, `nft`, `locker`, `fees`, `tokens`, and a
`reader` for aggregate chain reads. `presale.ts` reproduces the contract's two truncations exactly
in `tokensNeededFor`, so the interface never asks a user to fund a presale by one wei less than the
contract demands.

## The application layer

**`apps/web`** is a static React bundle with no server of its own — thirteen routes, one per
contract capability. Three properties hold everywhere:

- Nothing is read from a database. Listings, prices, risk flags and sale state all come from chain
  reads. This is why there is no backend to run and no cache to go stale.
- Nothing is signed without a simulation of the exact payload. A failed simulation blocks signing
  rather than warning, and "could not be checked" is its own state, never shown as success.
- Quotes are computed locally, from the differential-tested maths.

**`apps/edge`** is a Cloudflare Worker that exists for one reason: third-party API keys must not
ship in a browser bundle. It is an API-key custodian, rate limiter and cache. It holds no funds and
no keys to user accounts.

**`apps/mcp`** is a remote MCP server exposing the ecosystem to agents. It has **no signing code and
no submission path** — every tool returns an unsigned transaction for a human wallet to sign. That
is a structural property of the code, not a configuration.

## Testing

Four layers, each catching what the others cannot.

**Unit and fuzz** — known scenarios plus property-based edge cases. 185 Solidity tests.

**Stateful invariant suites** — properties that must hold after any call sequence the fuzzer can
construct, checked against ghost ledgers maintained independently of contract storage. Solvency is
verified against an external source of truth rather than the contract agreeing with itself.
`afterInvariant` asserts each campaign was substantive, so a change that makes one vacuous fails
loudly instead of passing silently.

**Differential** — the TypeScript curve port against the Solidity library, byte-exact.

**Integration and stress** — against a real node. Not redundant with the unit layer: Foundry raises
the EIP-170 limit inside tests, which is exactly how an undeployable `TokenFactory` passed 182 unit
tests. The stress harness has run 401 transactions and 110M gas across 432 invariant checks with
zero violations.

300 TypeScript tests across 9 files complete the picture.

### A failure worth remembering

`contracts/artifacts/` was gitignored, and `vm.writeFile` cannot create parent directories. On a
fresh clone, fixture generation failed and **126 of 292 tests — every differential and integration
test — did not run.** The suite reported success on what remained.

The lesson is not about `.gitignore`. It is that a test suite reporting green is evidence only if
you know what it ran. Fixed with a committed `.gitkeep`, an `mkdirSync`, and an error message that
says what to do.

## CI

Six jobs: `contracts`, `slither`, `typescript`, `stress`, `secrets`, `supply-chain`. Foundry is
pinned to v1.5.1 in all four places it appears — an unpinned `stable` drifted mid-project and
produced 107 lint findings with no source change.

`check-production-isolation.mjs` runs before anything else and fails the build if production
Solidity imports from `test/` or names a mock.

## What this architecture does not solve

- **No paid audit.** Two contracts hold user funds. Strong testing is not professional review.
- **Pre-seeded pools.** A well-funded attacker can mint LP into a curve's pair before graduation.
  Mitigated and surfaced, not eliminated.
- **Third-party liveness.** Charts, routing and storage each depend on an outside provider. Port
  boundaries make them swappable; they do not make them reliable.
- **Legal exposure.** Nothing in this repository addresses FIU-IND/PMLA or US money-transmission
  theory, and no amount of code can.

See [SECURITY.md](../SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md).
