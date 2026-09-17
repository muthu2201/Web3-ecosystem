# Deployment runbook

## Why this is not `forge script --broadcast`

The intended owner and treasury of the whole system is a wallet the operator controls personally.
`forge script` needs a raw private key on the command line. Handing the project's most privileged
key to a CLI — or to an assistant — is exactly the thing this architecture is built to avoid.

So the deployment is expressed as **plain transactions any wallet can send**, and split into two
phases with completely different trust requirements:

| | Phase A | Phase B |
|---|---|---|
| What | 17 contract deployments | 3 one-way bindings |
| Signed by | an ephemeral gas payer | the real owner wallet |
| Authority granted to the signer | **none** | all of it |
| Reversible | yes — redeploy under a new salt | **no** |

Phase A grants nothing. Every owner, treasury and admin in the system arrives as a *constructor
argument*, so the account paying that gas owns none of what it deploys and can be a throwaway
holding a few cents. Phase B is three calls that must come from the owner, and each is
irreversible once it lands.

## How contracts get placed: CREATE2

Every deployment goes through the canonical deterministic deployer at
`0x4e59b44847b379578588920cA78FbF26c0B4956C`, present on every chain targeted. This turns a
contract creation — which has no `to` address — into an ordinary call with calldata, which any
wallet can send.

The consequences are worth stating, because they shape the whole runbook:

- **Addresses are known before deployment.** They depend only on the salt and the init code (which
  embeds the constructor arguments). Nothing depends on the sender or its nonce.
- **The work can be split arbitrarily.** Across transactions, batches, wallets, or days, without a
  single address moving.
- **Resumption is free.** An address either has code or it does not. A run interrupted by a dropped
  transaction or an exhausted balance resumes exactly where it stopped, with no state to track.
- **The same contracts land at the same addresses on every chain** where the constructor arguments
  match. `BondingCurve` and `Presale` are the exceptions: they take the DEX router as a constructor
  argument, so they differ per chain by design.

Salts are namespaced `web3-ecosystem:v1:<ContractName>`, so a future breaking change gets a fresh
address set rather than colliding.

## The scripts

| Script | Does |
|---|---|
| `scripts/plan-create2-deploy.mjs` | Builds the plan: addresses, salts, calldata |
| `scripts/verify-create2-deploy.mjs` | Replays the plan against a fork of the target chain and asserts the result |
| `scripts/broadcast-create2-deploy.mjs` | Broadcasts phase A |
| `scripts/preflight-deploy.mjs` | Read-only check of a target before spending anything |

### The drift guard

`plan-create2-deploy.mjs` re-reads `contracts/script/Deploy.s.sol` on every run, extracts its
`new X(...)` set, and refuses to emit a plan if it does not match the plan's own contract list. A
plan that silently deployed a smaller system than the tested one would mean every test, review and
audit had been done against a different thing. The guard was verified by removing a contract from
the plan and confirming it stops.

### The fork verification

`verify-create2-deploy.mjs` sends **byte-for-byte the calldata the wallet will send** to a fork of
the real target chain, then asserts:

- all 17 contracts have code at their predicted addresses, each within the EIP-170 limit
- every owner and treasury resolves to the configured address
- every product fee starts at zero
- both clone implementations are permanently non-initialisable — `initialize` must revert with
  `AlreadyInitialized` specifically, not merely revert
- all three bindings take, and then refuse to be called a second time
- a real token deploys, a curve launches, and a buy on that curve succeeds

The last group matters most: it asserts the contracts *work*, not merely that they have code.

## The procedure

### 0. Preflight

```bash
SAFE_ADDRESS=0x… DEX_ROUTER=0x… RPC_URL=… node scripts/preflight-deploy.mjs
```

Checks chain id, deployer balance against ~25M gas, whether the owner address has code, that the
router answers `factory()` and `WETH()`, and that the factory answers the two-argument `getPair`.
Costs nothing and catches a wrong router before it costs anything.

### 1. Build and verify the plan

```bash
cd contracts && forge build && cd ..

SAFE_ADDRESS=0x… DEX_ROUTER=0x… node scripts/plan-create2-deploy.mjs

SAFE_ADDRESS=0x… DEX_ROUTER=0x… FORK_RPC_URL=<real chain RPC> \
  node scripts/verify-create2-deploy.mjs
```

Do not proceed on anything short of `Verification passed`.

### 2. Fund the gas payer

Generate an ephemeral key **locally**, into a scratch directory, never into the repository:

```js
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
```

Send it slightly more than the estimated cost. It owns nothing; the only risk it carries is the
dust left on it, which gets swept back at the end.

### 3. Phase A

```bash
RPC_URL=… DEPLOYER_KEY_FILE=… SAFE_ADDRESS=0x… DEX_ROUTER=0x… \
  node scripts/broadcast-create2-deploy.mjs
```

Each step estimates gas before sending, so a step that cannot succeed costs nothing and halts the
run rather than draining the budget. Re-run freely; already-deployed contracts are skipped.

The script prints the phase B calldata when it finishes.

### 4. Phase B — the irreversible part

Three transactions, sent by the owner wallet:

| Call | Target | Effect |
|---|---|---|
| `setCurveImplementation(address)` | `BondingCurveFactory` | fixes the code every future curve runs |
| `setPresaleImplementation(address)` | `PresaleFactory` | fixes the code every future presale runs |
| `bindDeployers(address × 6)` | `TokenFactory` | fixes the six token templates |

Each reverts if called a second time. There is no owner action that can change them afterwards.
That is the point: a launcher whose implementation could be swapped later is a launcher whose
guarantees are promises rather than facts.

Check the calldata against the plan before signing. The addresses in it must match the addresses
the verification run printed.

### 5. Record and wire

1. Confirm all 17 contracts have code on the live chain.
2. Confirm the three bindings took, by reading `curveImplementation`, `presaleImplementation` and
   `deployersBound`.
3. Confirm every product fee reads zero.
4. Record the addresses via `registerDeployment()` / `VITE_DEPLOYMENTS`.
5. Sweep the gas payer's remaining balance back to the owner, and discard the key.

### 6. Exercise it

Deploy a token, launch a curve, buy, and drive one curve to graduation. A deployment is not proven
by having code; it is proven by a graduation that created a real pool and left the LP
unrecoverable.

## Gas profile

Measured on a Base mainnet fork:

| Phase | Gas |
|---|---|
| A — 17 deployments | 31,241,142 |
| B — 3 bindings | 275,739 |
| **Total** | **31,516,881** |

Largest single deployment is `NftFactory` at 3,433,504 gas. Largest deployed bytecode is
`NftFactory` at 15,376 bytes, comfortably inside the 24,576-byte EIP-170 limit.

Per-chain costs are in [CHAINS.md](CHAINS.md).

## Rules

**Never accept a private key from the user, and never ask for one.** The user supplies addresses.
Gas is paid by an ephemeral key generated for that run and destroyed after.

**Never skip the fork verification.** It is free and it sends the same bytes.

**Never rush phase B.** Phase A is recoverable for the price of another deployment. Phase B is not
recoverable at all.
