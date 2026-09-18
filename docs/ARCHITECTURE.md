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

## Where this is deployed

The architecture below is live on **Base mainnet (eip155:8453)** as of 17 September 2026: 17
contracts placed through the canonical CREATE2 deployer, all source-verified, all three one-way
bindings taken, every fee reading zero. The addresses are in the README and in
[`../deployments/base-8453.json`](../deployments/base-8453.json).

Two consequences matter for reading the rest of this document. First, the sealing described under
[The two irreversible moments](#the-two-irreversible-moments) is not a future step — it has
happened, and the guarantees it converts from policy into property are now properties on Base.
Second, the deployed addresses are compiled into `@web3eco/chain-registry` rather than injected as
configuration, so the interface reads the chain with nothing set. A stale build of that package is
therefore indistinguishable, at runtime, from an undeployed chain; build the whole dependency
chain (`pnpm --filter "@web3eco/web..." build`), not just the app.

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

**`apps/web`** is a static React bundle with no server of its own — fourteen routes, one per
contract capability plus `/how-it-works`. Three properties hold everywhere:

- Nothing is read from a database. Listings, prices, risk flags and sale state all come from chain
  reads. This is why there is no backend to run and no cache to go stale.
- Nothing is signed without a simulation of the exact payload. A failed simulation blocks signing
  rather than warning, and "could not be checked" is its own state, never shown as success.
- Quotes are computed locally, from the differential-tested maths.

### Wallet connection

Two connectors, in a fixed order: an injected provider if one is in the page, WalletConnect
otherwise. There is no wallet picker, because the picker was the problem — an SDK-per-wallet
approach shipped a build that resolved at compile time and failed at the first click, and a deep
link sent phone users into a browser inside another app instead of connecting the one they had.

The ordering is not cosmetic. A provider already in the page is a direct call; WalletConnect is a
relay round trip, so it is the fallback rather than the default, and it reaches every wallet
rather than a list the interface has to maintain.

Two things this layer taught, both recorded in [DECISIONS.md](DECISIONS.md):

- **A wallet SDK's transitive dependencies are not resolvable from the app under pnpm's strict
  isolation.** The bundler emitted a bare specifier, the build passed, and the button threw in
  production. The fix is a direct dependency, verified resolvable before it is used — not a
  connector pulled in through another package.
- **A CSP that admits a connector still has to admit its network.** The connector loaded, the
  modal opened, and every request it made was refused. `connect-src` now names the relay and
  registry hosts explicitly, and `font-src` the one font origin they use — enumerated rather than
  widened.
- **And then it has to admit how the connector renders.** With the network allowed, the wallet
  list came back with names and a broken image beside every one. The chooser does not point an
  `<img>` at a remote URL: it fetches each icon, wraps it in a `Blob` and renders the object URL.
  `img-src` allowed `'self' data: https:`, so the fetch returned 200 and the browser refused the
  render. Allowing `blob:` fixes it and widens nothing — a `blob:` URL is one this page minted
  itself and carries no network reach.

### Design system

Four neon hues on a near-black ground, each naming a part of the product rather than a mood:
cyan for trading, magenta for creation, lime for live state and gains, violet for raising and
collecting. A page sets `--neon` once and every component beneath it reads that variable, so
colour carries navigation instead of decoration.

The tokens are declared with Tailwind's `@theme static`. Under the default `@theme`, Tailwind
emits only the variables some class mentions — and because `--neon` is set from a style attribute,
three of the four hues were tree-shaken out and every `var()` fell through to the cyan fallback: a
page that looked deliberate and was simply missing most of its colours.

The same tokens generate the social card and home-screen icons, via
`scripts/build-social-images.mjs`, so those cannot drift from the palette they came from.

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

305 TypeScript tests across 9 files complete the picture.

**The public side**, which none of the above covers. `scripts/audit-public-site.cjs` drives a real
browser over thirteen URLs at two widths against a real build — every top-level route, a live
curve, a live token, and a path that must fall back rather than blank — and fails on a page that
did not mount, a contract-backed page showing its "not deployed" guard, a nearly blank screen, horizontal
overflow, or console errors — then checks that every image and manifest the `<head>` promises
actually comes back with the right content type.

### Failures worth remembering

`contracts/artifacts/` was gitignored, and `vm.writeFile` cannot create parent directories. On a
fresh clone, fixture generation failed and **126 of 292 tests — every differential and integration
test — did not run.** The suite reported success on what remained.

The lesson is not about `.gitignore`. It is that a test suite reporting green is evidence only if
you know what it ran. Fixed with a committed `.gitkeep`, an `mkdirSync`, and an error message that
says what to do.

The same shape recurred three more times, each in a check rather than in the code it checked, and
each because the check asserted on a proxy for the thing rather than the thing:

| What passed | What was true | What the proxy was |
|---|---|---|
| 14/14 routes clean | every contract-backed page showed "not deployed" | no crash, no overflow |
| ALL CLEAN | the server was not running | Chromium's error page has text and no guard wording |
| 305 tests green | `fetch` threw in every browser | Node does not brand-check the receiver |

That last one is the sharpest. `globalThis.fetch` stored unbound on an instance and called as a
method throws `Illegal invocation` in a browser, because `fetch` is brand-checked against `Window`;
Node has no such check, so the entire adapter HTTP layer was broken in production and green in
CI. It is bound at construction now, with a regression test that supplies a receiver-checking
`fetch` — a test that fails against the old code in Node, where the real defect could not.

The rule this produces is the one in [CLAUDE.md](../CLAUDE.md): check the claim before making it,
against the thing itself.

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
