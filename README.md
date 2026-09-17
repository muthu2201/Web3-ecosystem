# Non-Custodial Multi-Chain Web3 Ecosystem

A token launcher, bonding-curve launchpad, presale platform, NFT suite and swap interface, built
so that no component ever holds user funds or signs on a user's behalf.

Implemented from the September 2026 technical blueprint, including its corrections: bonding-curve
tokens are restricted to a single ownerless template, liquidity is added to real DEX pools rather
than to an aggregator, and live curve pricing is computed client-side rather than indexed.

## Status

| Area | State |
|---|---|
| Contracts | 18 contracts, 185 tests (unit, fuzz, stateful invariant), Slither clean at high and medium |
| TypeScript | 6 packages and apps, 260 tests including differential tests against the Solidity |
| Stress test | 401 transactions, 110M gas, 432 invariant checks, zero violations |
| Audit | **None.** See [SECURITY.md](SECURITY.md) |

## What makes it non-custodial in fact

- Every value-moving action is a transaction the user signs in their own wallet.
- The backend is an API-key proxy and a cache. It holds no funds and no keys to user accounts.
- The MCP server has no signing code and no submission path; every tool returns an unsigned
  transaction.
- Fees settle atomically on-chain to a fee contract whose ceilings are compiled into bytecode.

The US money-transmission cases the blueprint cites turn on custody and operational control over
fund flow. This system is built to have neither, and the architecture is arranged so that is
checkable rather than merely asserted.

## Guarantees enforced in bytecode

These are not policies. There is no code path that could violate them.

- **Fees cannot exceed their published ceiling.** `maxBps` is `pure` with no setter; the flat-fee
  ceiling is `immutable`. Raising a fee below the ceiling is timelocked; lowering one is immediate.
- **A tax token's rate can only fall.** `setTaxes` reverts if either rate would rise, under an
  immutable per-deployment ceiling and a 10% compile-time constant. This removes the
  raise-the-sell-tax honeypot by construction.
- **Locked liquidity cannot be released early.** `LiquidityLocker` has no owner, no pause and no
  emergency path.
- **A failed presale always refunds.** `refund` is the only function that moves native currency
  out of a failed sale, and only to the contributor's own deposit.
- **A presale cannot open underfunded.** Initialisation verifies the real token balance covers
  every buyer at the hard cap plus the liquidity allocation.
- **Vested tokens cannot be clawed back.** Revocation returns only the unvested remainder.
- **The curve cannot be drained by rounding.** Every settlement rounds in the pool's favour.
- **The degen launcher cannot produce a rug.** It only knows how to build `StandardToken`: fixed
  supply, ownerless, no mint, no tax, no pause, no blocklist.

## Repository layout

```
contracts/          Foundry project: 18 contracts, 185 tests
  src/fees/         FeeRouter with bytecode-enforced caps and a timelock
  src/tokens/       Six audited templates behind per-template deployers
  src/launch/       BondingCurve, Presale and their factories
  src/liquidity/    LiquidityLocker
  src/distribution/ TokenVesting, MerkleDistributor
  src/nft/          NftCollection, NftFactory, NftMarketplace
  test/invariant/   Stateful invariant suites with handlers

packages/
  core/             Domain types, CAIP ids, curve and fee maths (bigint throughout)
  ports/            Interfaces for every external dependency
  chain-registry/   Config-driven chains with capability flags
  sdk/              viem transaction builders and generated ABIs
  adapters/         0x, GoPlus, GeckoTerminal, Etherscan V2, IPFS, simulation

apps/
  web/              Static React front-end (Tailwind v4, three.js hero, 13 routes)
  edge/             Cloudflare Worker: API-key custodian, rate limiter, cache
  mcp/              Remote MCP server returning unsigned transactions

scripts/stress/     Full-ecosystem load harness
```

## The interface

A static React bundle with no server of its own. Thirteen routes, one per contract capability:

| Route | What it does |
| --- | --- |
| `/` | Landing page; the hero renders the real bonding curve with three.js |
| `/explore` | Live market listing, read from the curve factory's own registry |
| `/curve/:address` | Bonding-curve trading, quoted locally from on-chain reserves |
| `/launch` | One-transaction launch onto a bonding curve |
| `/deploy` | Token deployment across all six templates, with the address predicted first |
| `/swap` | Aggregator or direct-router swap, every fee itemised |
| `/presale`, `/presale/:address` | Create a presale or fair launch; contribute, claim, refund |
| `/nft`, `/nft/:address` | Deploy a collection; configure phases and mint |
| `/lock` | Lock liquidity, extend a lock, verify any token's locked supply |
| `/token`, `/token/:address` | Token profile with risk flags read from the contract |

Three properties hold on every one of them:

- **Nothing is read from a database.** Listings, prices, risk flags and sale state all come from
  chain reads, which is why there is no backend to run and no cache to go stale.
- **Nothing is signed without a simulation.** Every transaction goes through a review step that
  simulates the exact payload about to be signed. A failed simulation blocks signing rather than
  warning, and "could not be checked" is shown as its own state, never as success.
- **Quotes are computed locally.** The curve maths in `@web3eco/core` is differential-tested
  byte-for-byte against the Solidity library, so a price can update per keystroke without an RPC
  round trip and still be the number the chain produces.

One build targets one chain set, chosen by `VITE_CHAIN_MODE`:

| `VITE_CHAIN_MODE` | Chains the interface can reach |
| --- | --- |
| unset (default) | Base, BNB Chain |
| `testnet` | BSC Testnet, Base Sepolia |

Never both. A visitor to the production site is never offered a testnet, so a token launched on
one cannot appear beside a real token in a listing; and a test build carries no mainnet chain, so
a misclick cannot spend real funds. The chain registry still holds all four entries as data in
either build - what changes is the set wagmi is configured with, which is the set the interface
can actually reach. `apps/web/src/wagmi.test.ts` asserts both directions.

Run it locally with `pnpm --filter @web3eco/web dev`. It needs `VITE_DEPLOYMENTS` to reach any
contract; without it, every contract-backed route says so plainly instead of failing obscurely.

## Getting started

Requires Node 22, pnpm 10 and Foundry.

```bash
pnpm install
cd contracts && forge build && forge test
cd .. && pnpm contracts:abi   # generate ABIs into the SDK
pnpm verify                   # typecheck, lint, TypeScript tests, contract tests
```

Run the full-ecosystem stress test against a local node:

```bash
pnpm stress
```

Scale it with `STRESS_CURVES`, `STRESS_TRADES`, `STRESS_PRESALES`, `STRESS_NFT_MINTS` and
`STRESS_TOKEN_DEPLOYS`.

## Deployment

**Run the preflight first.** It reads the live chain and refuses a target the contracts cannot
work with. This is not ceremony: `main` briefly carried a registry that named Aerodrome as Base's
DEX, and because the contracts call a two-argument `getPair(address,address)` that Solidly forks
do not expose, every graduation and every presale finalisation would have reverted — at the
moment a launch's whole raise was sitting in the contract. No test could catch it, because the
tests run against a mock DEX that answers correctly. The preflight catches it in one read.

```bash
RPC_URL=<rpc> EXPECTED_CHAIN_ID=<id> DEPLOYER=0x<your address> \
SAFE_ADDRESS=0x<safe> DEX_ROUTER=0x<v2 router> \
  node scripts/preflight-deploy.mjs
```

It checks chain identity, that the deployer can actually pay for ~25M gas, that the owner is a
contract rather than a lone key, and that the router and its factory answer the exact calls the
contracts make. It only ever reads; it never signs.

**Test on BSC Testnet.** Every Sepolia faucet now gates on holding a mainnet balance, which makes
a cold wallet unable to start. BNB testnet still has faucets that drip to a brand-new address, so
that is the rehearsal chain. A full deploy there costs 0.0025 tBNB against a 0.1 tBNB drip.

Verified routers, each confirmed against the live chain:

| Chain | Chain ID | Router (Uniswap V2 / PancakeSwap V2) |
| --- | --- | --- |
| Base | 8453 | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` |
| BNB Smart Chain | 56 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| Base Sepolia | 84532 | `0x1689E7B1F10000AE47eBfE339a4f69dECd19F602` |
| BSC Testnet | 97 | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` |

Aerodrome is deliberately absent. It has deeper liquidity on Base and the registry still lists it
for routing, but it cannot serve pool creation — see `supportsV2PoolCreation` in the registry.

Then deploy. `PRIVATE_KEY` is read from your own environment and never leaves your machine:

```bash
cd contracts
SAFE_ADDRESS=0x... DEX_ROUTER=0x... forge script script/Deploy.s.sol \
  --rpc-url <url> --broadcast --verify
```

Then, from the Safe:

1. `curveFactory.setCurveImplementation(...)` and `presaleFactory.setPresaleImplementation(...)`
2. `tokenFactory.bindDeployers(...)`
3. `feeRouter.proposeFeeConfig(...)` per product, then `executeFeeConfig` after the timelock

Every binding is one-way. **All fees start at zero** — a freshly deployed ecosystem charges
nothing until a multisig has explicitly, publicly and with notice turned them on.

## Testing approach

Three layers, each catching what the others cannot:

**Unit and fuzz tests** check known scenarios and property-based edge cases. The curve's rounding
invariants are fuzzed directly, because a rounding bug there is a drain vector rather than a
cosmetic error.

**Stateful invariant suites** check properties that must hold after any sequence of calls the
fuzzer can construct, against ghost ledgers maintained independently of contract storage — so
solvency is verified against an external source of truth rather than the contract agreeing with
itself. `afterInvariant` asserts each campaign was substantive, so a change that makes one vacuous
fails loudly instead of passing silently.

**Integration and stress tests** run against a real node. This layer is not redundant: Foundry
raises the EIP-170 code-size limit inside tests, so `TokenFactory` at 59,318 bytes — more than
double the limit, undeployable on any chain — passed all 182 unit tests before a real deployment
caught it. CI now enforces the limit explicitly.

Additionally, **differential tests** run 160 generated cases through both the Solidity curve
library and its TypeScript port and require byte-exact equality, so the price the interface quotes
is the price the chain will produce.

## Why Base and BNB Chain, and not Ethereum

Ethereum mainnet is deliberately absent from the chain registry. Measured against live gas prices
and live token prices on 17 September 2026, with gas figures taken from the local deployment and
the stress harness rather than estimated:

| Operation | Ethereum | Base | BNB Chain |
| --- | --- | --- | --- |
| Full platform deploy (one-off) | $31.90 | **$0.37** | $0.91 |
| Deploy a token | $1.08 | **$0.0125** | $0.0308 |
| Launch a bonding curve | $2.04 | **$0.0236** | $0.0580 |
| Buy on the curve | $0.23 | **$0.0027** | $0.0065 |
| Graduate to a DEX pool | $1.40 | **$0.0162** | $0.0399 |
| Mint an NFT | $0.15 | **$0.0018** | $0.0044 |

That snapshot *flatters* Ethereum: it was taken at 0.52 gwei, which is unusually cheap. At a more
typical 30 gwei the deploy is roughly $1,840 and a curve launch roughly $118.

The launch fee is the whole argument. This platform exists so people can launch cheap,
experimental tokens, most of which will fail — the honest graduation rate is 0.4-3%, stated on the
launch page. A $118 launch cost dwarfs the platform's own fee and changes what the product *is*:
it stops being somewhere you can try something and becomes somewhere only a funded team bothers.
Base at $0.02 keeps the economics the design assumes.

Adding a chain is a data change, not a code change (see `packages/chain-registry`). Anything added
needs a V2-compatible DEX — see `supportsV2PoolCreation` — and should clear this same cost test
before it ships.

## Branches and dependencies

Two branches, permanently:

- `main` — the stable line. Complete and releasable: contracts, SDK, workers, web app, and the
  full test suite. Nothing merges here that CI has not proven green.
- `develop` — where work lands before it is merged to `main`.

Tests live on `main` alongside the code they test, because a branch whose tests were removed is
a branch nothing can verify. What is kept out of production code is *mocks*, and that is enforced
mechanically rather than by convention: `scripts/check-production-isolation.mjs` fails the build
if anything in `contracts/src/` or the production `Deploy.s.sol` imports from `test/` or names a
mock. `script/DeployLocal.s.sol` is the single exemption, and the reason is recorded in the
exemption itself. CI runs the check before it runs anything else.

**Dependabot is deliberately not enabled.** There is no `.github/dependabot.yml`, and adding one
is what would switch version-update PRs on. Dependencies here are upgraded deliberately and in
one batch, because an upgrade to this repository has to clear the whole gate — production
isolation, a frozen-lockfile install, 13 typecheck targets, 8 build targets, 292 TypeScript
tests, 185 contract tests, `forge fmt`, and a responsive re-audit of all 13 routes. A stream of
single-dependency bot PRs cannot clear that gate individually and would either sit unmerged or
get waved through, which is worse than not having them. Dependabot *security alerts* are a
repository setting rather than a file; leave those on and act on them by hand.

## Honest limitations

Read [SECURITY.md](SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) before deploying
with real value. In short:

- **No paid audit.** Two contracts hold user funds. The testing here is strong for immutable
  standard logic and is not a substitute for professional review.
- **Pre-seeded pools.** A well-funded attacker can mint LP into a curve's pair before graduation.
  Mitigated and surfaced, not eliminated.
- **Third-party dependencies.** Charts, routing and storage each depend on an external provider
  with its own terms and uptime. Port boundaries make them swappable; adapters degrade to an
  explicit "unknown" rather than a false all-clear.
- **Legal exposure.** The blueprint identifies India's FIU-IND/PMLA regime and US
  money-transmission theory as the largest under-priced risks in the plan. Nothing in this
  repository addresses that, and no amount of code can. Engage counsel before launch.

## Licence

MIT for this repository's own source. Vendored dependencies keep their own licences:
OpenZeppelin Contracts (MIT), Solady (MIT), forge-std (MIT/Apache-2.0).
