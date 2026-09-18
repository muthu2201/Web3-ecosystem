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
| TypeScript | 5 packages and 3 apps, 305 tests including differential tests against the Solidity |
| Stress test | 401 transactions, 110M gas, 432 invariant checks, zero violations |
| Deployment | **Live on Base mainnet** (chain 8453), 17 contracts, all source-verified |
| Fees | **Zero everywhere.** Not lowered — never turned on |
| Audit | **None.** See [SECURITY.md](SECURITY.md) |

## Live on Base

Deployed 17 September 2026 through the canonical CREATE2 deployer. The full record — every
address, both implementations, the three binding transactions, the smoke test and the fate of the
gas payer — is [`deployments/base-8453.json`](deployments/base-8453.json).

| Contract | Address |
|---|---|
| `FeeRouter` | `0x5eD2184Bfb39870758494D45b31782F110ce4750` |
| `TokenFactory` | `0x38995Ced7d483FCb007814950F50Fc623786747B` |
| `BondingCurveFactory` | `0xA6744969E220A6cb91A7075b196641fD904De3b4` |
| `PresaleFactory` | `0x484eca933E4a39E99Fa145626c300b7D32e53853` |
| `LiquidityLocker` | `0x8Cbe6F46Fa48525aDaEdB5C0Dec832615D47bAeF` |
| `TokenVesting` | `0x26E10893ca7Ac32895229F6a8550541a266feD6D` |
| `MerkleDistributor` | `0x680494F62BcA3a42cE3a81895c1D5C265Ca96284` |
| `NftFactory` | `0x5a8Eefe72A2b6C7ba7AA702f6B2a5133627b1804` |
| `NftMarketplace` | `0x7A6edB5d346b1060C8C2087ADF4D550555cD6D3c` |

Four facts about this deployment that are checkable rather than asserted. Each was read back from
Base mainnet rather than inferred from the deployment succeeding — `eth_call` against the
addresses above reproduces all of them:

- **All three one-way bindings are taken.** `setCurveImplementation` and `setPresaleImplementation`
  revert `ImplementationAlreadySet()` (`0x0956634f`); `bindDeployers` reverts
  `DeployersAlreadyBound()` (`0x7bdba8a6`). No owner action can change the code a future launch,
  presale or token deployment runs on.
- **Both implementations are sealed.** `initialize` on either reverts `AlreadyInitialized()`
  (`0x0dc149f0`), so neither can be captured and re-pointed.
- **Every fee reads zero.** `feeConfig` returns `(0, 0, 0)` for all six products, and the ceilings
  above them are compiled in rather than stored.
- **The account that paid for the deployment holds nothing and never did.** It was generated for
  that run, given no authority — every owner and treasury is a constructor argument — swept back
  to the owner, and discarded. Phase A cost 0.00018 ETH in total.

All 17 contracts are source-verified on [Blockscout](https://base.blockscout.com). The interface
ships these addresses compiled into `@web3eco/chain-registry`, so nothing has to be configured at
deploy time for the site to read the chain.

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
  web/              Static React front-end (Tailwind v4, three.js hero, 14 routes)
  edge/             Cloudflare Worker: API-key custodian, rate limiter, cache
  mcp/              Remote MCP server returning unsigned transactions

scripts/stress/     Full-ecosystem load harness
```

## The interface

A static React bundle with no server of its own. Fourteen routes, one per contract capability:

| Route | What it does |
| --- | --- |
| `/` | Landing page; the hero renders the real bonding curve with three.js |
| `/how-it-works` | What each part does, in plain language — the one page that explains |
| `/explore` | Live market listing, read from the curve factory's own registry |
| `/curve/:address` | Bonding-curve trading, quoted locally from on-chain reserves |
| `/launch` | One-transaction launch onto a bonding curve |
| `/deploy` | Token deployment across all six templates, with the address predicted first |
| `/swap` | Aggregator or direct-router swap, every fee itemised |
| `/presale`, `/presale/:address` | Create a presale or fair launch; contribute, claim, refund |
| `/nft`, `/nft/:address` | Deploy a collection; configure phases and mint |
| `/lock` | Lock liquidity, extend a lock, verify any token's locked supply |
| `/token`, `/token/:address` | Token profile with risk flags read from the contract |

**Connecting a wallet** is one button with no menu. Where a provider is already in the page — a
browser extension, or a wallet's own in-app browser — it is used directly; otherwise WalletConnect
takes over, which shows a QR on a desktop and switches straight to the wallet app on a phone.
Either way the user never leaves the page for a browser inside another app. A failed connection
always says so on screen: a connect that silently goes nowhere is indistinguishable from a broken
site, and that shipped once already.

**The explanations live on one page.** Every product page used to carry its own paragraphs about
what the contracts do. That reading is real, but it belongs somewhere a person goes when they want
it, not in front of someone who has already decided to launch a coin and is looking for the
button. `/how-it-works` holds all of it, in terms of what each thing does for the person using it.

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

Run it locally with `pnpm --filter @web3eco/web dev`. The Base deployment is compiled into the
chain registry, so it works with no configuration at all. `VITE_DEPLOYMENTS` still overrides or
adds a chain's addresses; on a chain with neither, every contract-backed route says so plainly
instead of failing obscurely. `VITE_WALLETCONNECT_PROJECT_ID` selects the WalletConnect project,
and `VITE_SITE_URL` (or the host's own deployment URL) is what the link-preview tags are built
against.

### Checking the public side

`scripts/audit-public-site.cjs` walks the site at two widths against a real build and fails on
what a visitor would actually notice — a page that did not mount, a contract-backed page showing
its "not deployed" guard, a nearly blank screen, horizontal overflow, console errors — and then
checks that every image and manifest the `<head>` promises actually comes back, with the right
content type.

Each of those checks exists because a shallower one passed something it should not have. An
earlier version reported 14/14 clean while every contract-backed page rendered the same "not
deployed" placeholder, then reported ALL CLEAN against a dead server, because Chromium's own error
page has plenty of text and no guard wording. The asset check is the third instance: the site
declared a large summary card with no image behind it, so every link shared to X, WhatsApp,
Telegram or Discord rendered a blank slot — invisible to every check, because no page renders it.

```bash
pnpm --filter "@web3eco/web..." build      # the ... matters: a stale registry reads as undeployed
npx http-server apps/web/dist -p 4174 --proxy "http://127.0.0.1:4174?"
node scripts/audit-public-site.cjs
```

The social card and home-screen icons are generated from the design tokens rather than drawn, so
the palette cannot drift from `globals.css`:

```bash
node scripts/build-social-images.mjs
```

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

The full runbook is [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and it has now been run once, on
Base — see [Live on Base](#live-on-base) above and
[`deployments/base-8453.json`](deployments/base-8453.json) for what came out of it. The shape of
it:

**Run the preflight first.** It reads the live chain and refuses a target the contracts cannot
work with. This is not ceremony: `main` briefly carried a registry that named Aerodrome as Base's
DEX, and because the contracts call a two-argument `getPair(address,address)` that Solidly forks
do not expose, every graduation and every presale finalisation would have reverted — at the
moment a launch's whole raise was sitting in the contract. No test could catch it, because the
tests run against a mock DEX that answers correctly. The preflight catches it in one read.

```bash
RPC_URL=<rpc> EXPECTED_CHAIN_ID=<id> DEPLOYER=0x<gas payer> \
SAFE_ADDRESS=0x<owner> DEX_ROUTER=0x<v2 router> \
  node scripts/preflight-deploy.mjs
```

Verified routers, each confirmed against the live chain:

| Chain | Chain ID | Router (Uniswap V2 / PancakeSwap V2) |
| --- | --- | --- |
| Base | 8453 | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` |
| BNB Smart Chain | 56 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| Base Sepolia | 84532 | `0x1689E7B1F10000AE47eBfE339a4f69dECd19F602` |
| BSC Testnet | 97 | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` |

Aerodrome is deliberately absent. It has deeper liquidity on Base and the registry still lists it
for routing, but it cannot serve pool creation — see `supportsV2PoolCreation` in the registry.

**Then build the plan, verify it against a fork of the real chain, and broadcast.** Deployment does
not use `forge script`, because that needs a raw private key and the owner key belongs only in the
operator's wallet. Instead every contract is placed through the canonical CREATE2 deployer, which
turns a contract creation into an ordinary call any wallet can send:

```bash
SAFE_ADDRESS=0x… DEX_ROUTER=0x… node scripts/plan-create2-deploy.mjs
SAFE_ADDRESS=0x… DEX_ROUTER=0x… FORK_RPC_URL=<real chain> node scripts/verify-create2-deploy.mjs
RPC_URL=… DEPLOYER_KEY_FILE=… SAFE_ADDRESS=0x… DEX_ROUTER=0x… \
  node scripts/broadcast-create2-deploy.mjs
```

The verification replays byte-for-byte the calldata that will be broadcast, against a fork of the
target chain, and asserts the resulting state — owners, immutables, fees at zero, implementations
sealed, bindings taken and no longer re-callable — then deploys a token, launches a curve and buys
on it. Anything that would revert on-chain reverts there first, for free.

The account that pays for those 17 deployments receives **no authority whatsoever**: every owner,
treasury and admin arrives as a constructor argument. It can be a throwaway holding a few cents.

**Then, from the owner wallet**, three one-way bindings:

1. `curveFactory.setCurveImplementation(...)` and `presaleFactory.setPresaleImplementation(...)`
2. `tokenFactory.bindDeployers(...)`

and later, when fees are wanted, `feeRouter.proposeFeeConfig(...)` per product followed by
`executeFeeConfig` after the timelock. On Base that has not been done and is not planned until the
platform has been used by real people for real launches — see **Fees** in the status table.

Every binding is one-way. **All fees start at zero** — a freshly deployed ecosystem charges
nothing until the owner has explicitly, publicly and with notice turned them on.

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

Those per-operation figures were taken at one moment; L2 base fees move hour to hour, so treat
them as an order of magnitude rather than a quote. The full-deployment row was remeasured on
17 September against 31,516,881 gas and live prices — **$0.54 on Base, $1.15 on BNB Chain, $12.78
on Ethereum.** The current per-chain table lives in [docs/CHAINS.md](docs/CHAINS.md), which is the
one to trust when they disagree.

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

**One branch, `main`.** An earlier attempt at a second branch for tests and features produced
exactly the merge conflicts it was meant to avoid. `main` is the stable line — contracts, SDK,
workers, web app and the full test suite — and CI is the gate. Nothing lands that CI has not
proven green.

Tests live on `main` alongside the code they test, because a branch whose tests were removed is
a branch nothing can verify. What is kept out of production code is *mocks*, and that is enforced
mechanically rather than by convention: `scripts/check-production-isolation.mjs` fails the build
if anything in `contracts/src/` or the production `Deploy.s.sol` imports from `test/` or names a
mock. `script/DeployLocal.s.sol` is the single exemption, and the reason is recorded in the
exemption itself. CI runs the check before it runs anything else.

**Dependabot is deliberately not enabled.** There is no `.github/dependabot.yml`, and adding one
is what would switch version-update PRs on. Dependencies here are upgraded deliberately and in
one batch, because an upgrade to this repository has to clear the whole gate — production
isolation, a frozen-lockfile install, 13 typecheck targets, 8 build targets, 305 TypeScript
tests, 185 contract tests, `forge fmt`, and a responsive re-audit of the public site. A stream of
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
