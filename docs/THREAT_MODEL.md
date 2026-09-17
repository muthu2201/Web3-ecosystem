# Threat model

Written as a set of questions an attacker would ask, with what actually stops them.

## "Can I make the platform charge more than it advertises?"

No. `FeeRouter.maxBps` is a `pure` function and the flat-fee ceiling is `immutable`. There is no
code path that writes either, so no owner, proxy or governance action can raise a fee past them.
Raising a fee below the ceiling requires a timelocked proposal, visible on chain before it takes
effect. Lowering one is immediate, because that only helps users.

Every product's fee path is tested end to end at the ceiling, so the guarantee holds through the
full call stack rather than only at the router.

## "Can I drain a bonding curve a wei at a time?"

No. Every settlement path rounds in the pool's favour: tokens out and native out round down,
native in rounds up, implemented by rounding the resulting reserve up with `ceilDiv`. Fuzz tests
assert a buy-then-sell round trip is loss-making at every input size and across repeated
iterations, and a stateful invariant asserts the constant product never falls across any sequence
the fuzzer can build.

## "Can I move the curve price by donating to it?"

No. Reserves are tracked in storage and never read from `address(this).balance`, so a donation
would not affect pricing even if it arrived. `receive` rejects everything except the router and
WETH, so it cannot arrive in the first place.

## "Can I force an early graduation, or block one?"

No to both. The curve graduates exactly when its supply is exhausted, and the native raised at
that point is a pure function of launch parameters — computable before the first trade, and with
no operator-settable threshold to move. Graduation mints liquidity by calling `pair.mint()`
directly rather than through `addLiquidity`, so a stray token transfer to the pair is absorbed
rather than bricking the router's `quote()`.

## "Can I take the address someone computed for their token?"

No. CREATE2 salts are `keccak256(abi.encode(msg.sender, userSalt))`, so each deployer has a
disjoint address space. The per-template deployer contracts are locked to their factory, closing
the same gap at that level: without the lock, anyone could call a deployer directly with a salt
another user had already computed.

## "Can I get a presale's money out without delivering?"

No. The sale is funded with tokens before it can accept a contribution — `initialize` verifies the
real balance covers every buyer at the hard cap plus the liquidity allocation. The owner has no
withdrawal path while a sale is live and none at all if it fails; `refund` is the only function
that moves native currency out of a failed sale, and it can only send a contributor their own
deposit. Finalisation is atomic, so there is no intermediate state where the owner holds the raise
but the pool does not exist. Once a sale is finalisable the owner also loses the ability to cancel.

## "Can I raise a token's tax after people buy?"

Not on this platform. `setTaxes` reverts if either rate would increase, the per-deployment ceiling
is immutable, and the absolute ceiling is a compile-time constant of 10%. The rate a buyer reads
is therefore a hard upper bound on the rate they can ever pay. This removes the single most common
honeypot mechanism by construction rather than by policy.

## "Can I launch a rug through the one-click launcher?"

The launcher only knows how to build `StandardToken`: fixed supply, ownerless, no mint, no tax, no
pause, no blocklist. Those capabilities are not defaults that happen to be off — the code to
perform them does not exist in that template, and the bonding-curve factory has no path to any
other one. Eligibility is additionally enforced in the SDK and the interface.

What remains possible is ordinary market risk: a creator can buy early and sell into demand. The
dev buy is capped as a share of the eventual raise, under a ceiling compiled into the factory, and
a per-wallet cap applies during the opening window.

## "Can I release locked liquidity early?"

No. `LiquidityLocker` has no owner, no admin role, no pause, no emergency withdrawal and no
upgrade path. There is no code that moves a locked balance before its unlock time, so there is
nothing for a compromised key to call.

## "Can I claw back tokens I already vested to someone?"

No. Revocation returns only the unvested remainder and freezes the vested figure. An earlier
version recomputed vesting against the shrunken total and retroactively un-vested tokens the
beneficiary already owned; a fuzz test caught it and it is now explicitly prevented.

## "Can I compromise the front-end and drain users?"

This is the most realistic attack on the whole system, and the honest answer is that it is a real
risk that is mitigated rather than eliminated. It is how roughly $1.46B left Bybit in February
2025 without any contract being exploited.

Mitigations: pinned dependencies, frozen lockfiles, gated dependency audits, secret scanning, a
strict CSP, generated ABIs verified current in CI, and transaction simulation before signing so a
swapped payload is visible before the signature rather than after the funds are gone. The
remaining step, reproducible IPFS builds pinned by CID behind ENS, is a deployment practice this
repository documents but cannot perform for you.

## "Can I use the edge proxy as an attack tool?"

Upstream hosts are fixed in code and only allowlisted parameters are forwarded, so it cannot be
pointed anywhere. Fee parameters are validated against the platform's published ceiling, so it
cannot be used to route an inflated fee under the platform's name and API key. Upstream response
headers are dropped, so account-scoped rate-limit counters and internal hostnames do not leak.
CORS reflects only allowlisted origins and never falls back to a wildcard.

## "Can I make an AI agent drain a user's wallet?"

The agent reads token names and listing text, all attacker-controlled, so prompt injection through
on-chain data is assumed rather than hoped against. The defence is that the MCP server has no key
and no submission path: every state-changing tool returns an unsigned transaction. Value ceilings
and a destination allowlist are enforced in code, so an agent that has been talked into an urgent
transfer still cannot build one. On-chain text is flattened before it enters a response, so a
token name cannot masquerade as a new section of the server's own output.

The residual risk is a user who signs without reading. Every response carries an explicit warning,
and the interface simulates before signing.

## "Can I break it by being the 500th user rather than the first?"

The stress harness exists to answer this. It drives the whole system under concurrent load from
many accounts and re-checks solvency invariants after individual operations. At 401 transactions
and 110M gas across 12 curve launches, graduations, presales in both outcomes and NFT mints, every
invariant held.

## What is not covered

- Economic attacks that are simply bad trades: buying a token whose creator then sells.
- A malicious token deployed outside this platform and merely displayed by it. Such tokens report
  `template: unknown`, and the interface states that absence of findings means unknown, not safe.
- Chain-level failures: reorgs, sequencer outages, a compromised bridge.
- Legal risk, which the blueprint identifies as the largest under-priced exposure and which no
  amount of code addresses.
