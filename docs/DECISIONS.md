# Decision log

Every consequential choice, with the evidence behind it. Read this before arguing with an existing
decision — most of the surprising ones were forced by something measured against a live chain, and
the measurement is recorded here.

Newest first.

---

## The owner and treasury is a MetaMask EOA, and the revenue address is changeable by design

**Decided:** 17 Sep 2026

The Coinbase Base Account was abandoned as owner. Of the three blockers it produced, only one was
genuinely the wallet's: `keys.coinbase.com` refuses to sign for Base Sepolia at all
("This chain is not supported"). That is not a settings toggle, and it would recur on every
testnet and every chain Coinbase chooses not to serve. The other two were a wrong tool call on our
side, and faucet gating that has nothing to do with which wallet holds an address.

Owner and treasury is now `0x7Dd4B2E211dD40134eDf9736690497E057D45233` — a plain MetaMask EOA,
verified as a valid checksummed address holding a balance on Base with no code. No code change was
needed anywhere: `apps/web/src/wagmi.ts` already uses the `injected()` connector, which MetaMask
satisfies, and `SAFE_ADDRESS` is an environment variable.

**What it changed:** the owner is a constructor argument, so most CREATE2 addresses moved. Free to
do now, expensive after launch — which is the argument for settling wallet choice before
deploying rather than after. `LiquidityLocker`, `TokenVesting` and `MerkleDistributor` keep their
addresses because they take no constructor arguments and have no owner at all.

### The revenue address was already changeable

The request to make revenue collection upgradable needed no work: `FeeRouter` has carried a
timelocked two-step treasury change since it was written.

| Function | Effect |
|---|---|
| `proposeTreasury(address)` | queues a new treasury, `eta = now + timelockDelay` (48h) |
| `executeTreasury()` | applies it, but only once the ETA has passed |
| `cancelTreasury()` | drops a queued change |
| `pendingTreasury()` | public view — anyone can see a pending change and its ETA |

The delay is deliberate and is the whole point: a compromised owner key cannot silently redirect
revenue, because the change is visible on-chain for two days before it can take effect. An
instant setter would have been easier to use and worth nothing.

Moving ownership to a multisig later uses `Ownable2Step` — `transferOwnership` then
`acceptOwnership` from the new owner. The two steps matter: ownership cannot be handed to an
address that is unable to accept it, so a typo cannot brick the contract.

Both paths are owner-only and neither is one-way, which is the correct shape here. The bindings
that *are* one-way — implementations and token deployers — are one-way on purpose, because those
are what make the guarantees structural rather than promised.

---

## Base mainnet is the first deployment, and there is no public testnet rehearsal

**Decided:** 17 Sep 2026

Base Sepolia turned out to be unreachable in practice, and the workarounds cost more than the
destination.

- The operator's wallet signer refuses Base Sepolia outright — `keys.coinbase.com` returns
  "This chain is not supported". Not a settings toggle; the chain is not served. Funds already sent
  to that address on Base Sepolia cannot be moved by the wallet at all.
- Every Base Sepolia faucet gates on a mainnet ETH balance. Coinbase's CDP faucet is discontinued.
  QuickNode's FAQ states no minimum is required but its form rejects with *"Invalid ETH mainnet
  balance"*. Alchemy requires 0.001 ETH on Ethereum mainnet; GetBlock 0.005. Circle's faucet
  dispenses USDC, which does not pay gas.

The arithmetic settles it: a faucet asks you to *hold* ~0.001 ETH (~$2.45) to unlock it, while the
entire Base mainnet deployment *spends* 0.000225 ETH (~$0.55). The toll exceeds the destination.

**What replaces the rehearsal:** the full deployment verified against a **fork of Base mainnet** —
real Uniswap V2 router, real WETH, real chain state — including a live token deployment, curve
launch and buy. This tests strictly more than Base Sepolia would, because Sepolia's DEX has no real
liquidity behind it.

**Risk accepted:** fees start at zero, so nothing is extractable on day one. If a defect surfaces, a
fresh deployment under a new salt namespace costs another $0.55 and the old contracts sit inert
with no liquidity in them.

---

## The owner wallet is an EIP-7702 EOA, not a smart account

**Decided:** 17 Sep 2026 — a correction to an earlier misdiagnosis.

The treasury address was initially assumed to be a counterfactual ERC-4337 smart account, because
`send_calls` failed with `AA20 account not deployed` and the address had no code on Base Sepolia.
That was wrong. Reading its code on Base mainnet:

```
0xef01007702cb554e6bfb442cb743a7df23154544a7176c
```

The `0xef0100` prefix is an **EIP-7702 delegation**. The address is an ordinary EOA that has
delegated to a smart-wallet implementation at `0x7702cb…176c`. On Base Sepolia it has no
delegation, so the 4337 bundler path `send_calls` uses rejected it — but a plain `send` went
through on the first attempt.

**Why it matters:** a 7702 EOA is a better treasury owner than a counterfactual contract account.
It exists at the same address on every chain with no per-chain deployment step, while still getting
batching and sponsorship wherever the delegation is set. The `preflight-deploy.mjs` warning about
the owner address having no code is flagging exactly this, and is benign.

**The lesson recorded:** the first diagnosis came from reasoning about an error message. The
correct one came from reading the account's code. Read the chain.

---

## Deploy via CREATE2 from an ephemeral gas payer, not `forge script` with the owner's key

**Decided:** 17 Sep 2026

`forge script --broadcast` requires a raw private key. The owner key is the most privileged secret
in the project and belongs only in the operator's wallet.

The alternative considered first was driving all 17 deployments through the wallet's batched-call
interface. Rejected on mechanics: the contract bytecode totals ~164 KB, and there is no reliable
way to pass that volume of hex through a tool argument — a single flipped character deploys
corrupted code.

**The chosen split:** contract bytecode goes out over plain RPC from a disposable key that owns
nothing (every owner is a constructor argument); the three calls that actually carry authority are
signed by the owner wallet, and their calldata is small enough to verify by eye.

Full rationale in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Uniswap V2 is the default DEX on Base, not Aerodrome

**Decided:** 16 Sep 2026. This one was a live defect.

Aerodrome was originally the default on Base — it has far deeper liquidity, and the reasoning was
sound in the abstract. It was verified against live Base and found broken:

```
Uniswap V2 factory  getPair(a, b)         → address
Aerodrome factory   getPair(a, b)         → execution reverted
Aerodrome factory   getPool(a, b, false)  → address
```

Aerodrome is a Solidly fork. Its factory takes a third stable/volatile argument, and its pools mint
no fungible LP token. **Every graduation on Base would have reverted with the entire raise sitting
in the contract**, and the "LP burned" guarantee could not have been checked even if it had worked.

**The fix:** a `supportsV2PoolCreation` flag per DEX; `defaultDex()` filters on it and **throws**
rather than falling back to `dexes[0]`; 21 tests pin the invariant. Aerodrome stays listed with the
flag `false`, usable for routing and quotes, structurally unable to be chosen for graduation.

**Why the flag rather than deleting Aerodrome:** the failure mode to design against is a future
contributor adding a DEX and assuming it works. A boolean they must set makes the question
unavoidable.

---

## Uniswap V2, not V3 or V4, even though V4 is live

**Decided:** early, revisited 16 Sep 2026 and upheld.

V3 and V4 represent liquidity positions as **ERC-721 NFTs**. The system's core promise is that
graduated liquidity can never be pulled, and that promise has to be verifiable by anyone with a
single `balanceOf` call against the dead address. An NFT position has no balance to read, and
`LiquidityLocker` is ERC-20-only by design.

This is a deliberate trade of capital efficiency for a checkable guarantee.

**The cost, measured:** Base's flagship Uniswap V2 pool holds ~$1.25M against PancakeSwap V2's
~$76.6M on BNB — 61×. Base's real liquidity lives on the venues this architecture cannot use. See
[CHAINS.md](CHAINS.md) for what would be needed to change this.

---

## Ethereum is absent from the chain registry

**Decided:** 16 Sep 2026

At 0.166 gwei, a full deployment on Ethereum costs ~$12.78 and a single curve launch ~$1.52 —
roughly 24× Base. The launch products target users making small speculative bets; a $1.52 floor per
launch makes them uneconomic. Ethereum can be added later if there is demand willing to pay for it.

---

## One build targets one chain set

**Decided:** 17 Sep 2026

`apps/web/src/wagmi.ts` picks `MAINNET` or `TESTNET` from the build mode, so a production build
never offers testnets in its chain switcher.

**Stated precisely, because an earlier claim here was too strong:** this controls which chains the
app connects to and displays. It is not a network-level block — the RPC endpoint strings for all
four chains appear in both bundles, because the registry is one module. Verified by inspecting the
built bundles.

---

## Tests live on `main`, and there is only one branch

**Decided:** 16 Sep 2026, by the operator.

An earlier attempt at a second branch for tests and features produced exactly the merge conflicts
it was meant to avoid. One branch, `main`, with CI as the gate.

---

## Foundry pinned to v1.5.1

**Decided:** 16 Sep 2026

An unpinned `stable` drifted mid-project and produced 107 new lint findings in a single CI run,
with no source change. Pinned in all four places it appears in CI.

The backlog those findings represented has since been worked off: `forge lint` now reports three
notes — one code-size suggestion on a one-line modifier in `TokenDeployers.sol`, and two
`vm.writeFile` notes in local-only scripts. None in production logic.

---

## Coverage runs with `--ir-minimum` and skips scripts

**Decided:** 16 Sep 2026

`forge coverage` disables `via_ir`, which puts this codebase over the stack limit — "Stack too
deep". The configuration is `--ir-minimum --skip 'script/**' --no-match-contract CodeSizeTest`.

**Why skipping `CodeSizeTest` is safe:** `--ir-minimum` changes the generated bytecode, so size
measurements taken under coverage would be meaningless. The EIP-170 limit is still enforced by
`forge test` on the real build, and by a dedicated size gate.

---

## Mock isolation is enforced by a build script, not by review

**Decided:** 16 Sep 2026

`scripts/check-production-isolation.mjs` fails the build if `contracts/src/` or `Deploy.s.sol`
imports from `test/` or names a mock. `DeployLocal.s.sol` is the single recorded exemption, because
deploying a mock DEX to a local chain is its entire purpose.

Verified by planting a violation and confirming the check fails.

---

## Artifacts directory is committed with a `.gitkeep`

**Decided:** 16 Sep 2026. This one was hiding a real problem.

`contracts/artifacts/` was gitignored, and `vm.writeFile` cannot create parent directories. On a
fresh clone the fixture generation failed silently, and **126 of 292 tests — every differential and
integration test — were not running at all.** The failure was invisible because the suite reported
success on what remained.

Fixed with a committed `.gitkeep`, an `mkdirSync` in the generator, and an error message that says
what to do rather than failing quietly.

---

## `ws` pinned above 8.21.0 via a pnpm override

**Decided:** 16 Sep 2026

`pnpm audit` failed on GHSA-96hv-2xvq-fx4p, a DoS in `ws` reaching the tree through
wagmi → WalletConnect → viem. Fixed with a scoped override rather than waiting upstream. Revisit
when WalletConnect updates its own dependency.

---

## Dependabot is not enabled

**Decided:** 16 Sep 2026, by the operator.

Dependency updates are handled deliberately. The supply-chain CI job still runs `pnpm audit`, so
vulnerabilities surface without a bot opening pull requests.
