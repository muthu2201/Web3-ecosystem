# Security

## Reporting a vulnerability

Do not open a public issue for a security problem. Email the address in the repository's
organisation profile with a description, affected contracts or endpoints, and a reproduction if
you have one. You will get an acknowledgement within 72 hours.

## What this system is, in security terms

Non-custodial. No component of this platform ever holds user funds or signs on a user's behalf.
Every value-moving action is a transaction the user signs in their own wallet. The backend is an
API-key proxy and a cache; the MCP server builds unsigned transactions and has no key at all.

That shapes the whole threat model: the worst outcome of compromising the platform's
infrastructure is bad data and a burned API quota. Losing funds requires either a flaw in a
contract, or getting a user to sign something they did not intend.

## Residual risk, stated plainly

**These contracts have not had a paid audit.** They are covered by 185 tests including fuzz and
stateful invariant suites, static analysis gated in CI, and a full-ecosystem stress harness. That
is genuinely strong for standard, immutable logic. It is not equivalent to a professional audit
for contracts that hold user funds, and `BondingCurve` and `Presale` do hold user funds.

Anyone deciding whether to deploy this with real value should read that sentence as written. The
mitigations that reduce but do not eliminate the risk:

- Fund-holding contracts are immutable and non-upgradeable, so their behaviour cannot change after
  review.
- Fees are capped in bytecode with no setter, so the worst-case extraction is bounded and knowable.
- Every parameter change is timelocked, so users get advance notice.
- Invariants are asserted continuously under randomised load, not only in scenario tests.

The blueprint's recommendation stands: fund a competitive audit or contest from revenue before
scaling the fund-holding products, and run a bug bounty.

## Known limitations

**Pre-seeded pool before graduation.** A well-funded attacker can buy from a curve and mint LP into
its pair before graduation, taking a share of the graduated pool at a price of their choosing. The
pair is created at launch so its creation cannot be front-run, and graduation mints directly
against the pair so a stray transfer cannot brick it or leave dust. What remains is that seeding
costs real capital at a real price and is arbitraged, but is not harmless. `poolPreSeeded()`
reports the condition so the interface can warn before anyone trades.

**Compliance tokens are custodial in effect.** `ComplianceToken` lets a custodian seize any
balance. It exists because regulated issuers are legally required to hold that power. It is
reported at maximum severity everywhere it appears and is permanently barred from bonding-curve
mode.

**ERC-2981 royalties are not enforceable.** The marketplace honours them; most others no longer do.
Creators are told this rather than sold enforcement that does not exist.

**Third-party dependencies.** Charts depend on GeckoTerminal, routing on 0x, storage on Pinata.
Each has its own terms and uptime. The port boundaries make any of them swappable, and adapters
degrade to an explicit "unknown" rather than a false all-clear.

## Design decisions that are security properties

| Property | How it is guaranteed |
|---|---|
| Fees can never exceed their published ceiling | `maxBps` is a `pure` function with no setter; the flat-fee ceiling is `immutable` |
| A tax token's rate can never rise | `setTaxes` reverts if either rate would increase; the ceiling is immutable |
| Locked liquidity cannot be released early | `LiquidityLocker` has no owner, no pause and no emergency path |
| A failed presale always refunds in full | `refund` is the only function that moves native currency out of a failed sale |
| A presale cannot open underfunded | `initialize` verifies the real token balance covers the hard cap |
| Vested tokens cannot be clawed back | Revocation freezes the vested figure and returns only the unvested remainder |
| The curve cannot be drained by rounding | Every settlement rounds in the pool's favour; proven by fuzz and invariant tests |
| Donations cannot move the curve price | Reserves are tracked in storage; `receive` rejects all but router and WETH |
| A deployer cannot be front-run to an address | CREATE2 salts are `keccak256(caller, salt)` |
| The template set cannot be swapped later | Implementation and deployer bindings are one-way |
| An agent cannot move funds | The MCP server has no key and returns only unsigned transactions |

## Front-end supply chain

The Bybit/Safe compromise in February 2025 moved roughly $1.46B without touching a contract:
attackers injected JavaScript into a served front-end and had a multisig sign something other than
what was displayed. Every contract here could be flawless and that attack would still work.

Mitigations in this repository:

- Pinned dependencies and a frozen lockfile in CI.
- `pnpm audit` gated at high severity.
- Secret scanning on every push.
- A strict `Content-Security-Policy` with `default-src 'none'`.
- Transaction simulation before signing, surfacing the real balance changes.
- Generated ABIs verified current in CI, so the SDK cannot describe a contract that is not deployed.

The remaining step for a production deployment is reproducible builds published to IPFS by CID
with an ENS name, so the served bundle's hash is independently verifiable. That is a deployment
practice rather than a code change, and it is not done for you here.

## Operational requirements

- The `FeeRouter` owner and treasury must be a hardware-backed multisig. A single EOA defeats the
  timelock, because the point of the delay is that several people must agree and users can watch.
- Bind implementations and deployers immediately after deployment; the factories refuse to operate
  until bound, and the binding is one-way.
- Fees start at zero. Turning them on requires a timelocked proposal and execution from the Safe.
