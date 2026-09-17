# Chain support

## The short answer

Four chains are configured today: **two mainnets and two testnets.**

| Chain | CAIP-2 | Role | Default DEX | Pool creation |
|---|---|---|---|---|
| Base | `eip155:8453` | mainnet, first deployment target | Uniswap V2 | yes |
| BNB Smart Chain | `eip155:56` | mainnet | PancakeSwap V2 | yes |
| Base Sepolia | `eip155:84532` | testnet | Uniswap V2 | yes |
| BNB Smart Chain Testnet | `eip155:97` | testnet | PancakeSwap V2 | yes |

Nothing in the contracts is chain-specific. Adding a fifth chain is a registry entry plus a
deployment, not a code change — provided the chain clears the one hard constraint below.

## The hard constraint: the DEX must be Uniswap V2-shaped

This is the single thing that decides whether a chain can host this system, and it is worth
understanding before proposing a new one.

When a bonding curve graduates, it creates a real DEX pool, seeds it, and then makes the liquidity
permanently unrecoverable — either by burning the LP token to `0x…dEaD` or by locking it in
`LiquidityLocker`. The promise being made to a buyer is "this liquidity can never be pulled", and
the promise has to be **checkable by anyone with a single `balanceOf` call.**

That requires two things from the DEX:

1. A factory that answers **`getPair(address,address)`** — the exact two-argument signature in
   `contracts/src/interfaces/IUniswapV2.sol`.
2. A pool that mints a **fungible ERC-20 LP token**, so that "burned" means a balance at the dead
   address that anyone can read.

Two families of DEX fail this, and both failures were verified against live chains rather than
assumed:

**Solidly forks — Aerodrome, Velodrome.** Their factory exposes `getPool(address,address,bool)`,
taking a stable/volatile flag. The two-argument `getPair` reverts. Verified live on Base:
Uniswap V2's factory returns an address; Aerodrome's reverts with `execution reverted`; Aerodrome's
own `getPool(a, b, false)` returns an address. Had Aerodrome remained the default, every graduation
on Base would have reverted *with the entire raise sitting in the contract*.

**Uniswap V3 and V4.** Their liquidity positions are ERC-721 NFTs, not fungible tokens. There is no
balance to read, so "the LP was burned" cannot be established with one call, and `LiquidityLocker`
is ERC-20-only by design. This is why the system targets V2 despite V4 being live — it is a
deliberate choice in favour of a verifiable guarantee, not an oversight.

The registry encodes this as a per-DEX flag:

```ts
readonly supportsV2PoolCreation: boolean;
```

`defaultDex()` filters on that flag and **throws** if no DEX on the chain can create pools. It does
not silently fall back to `dexes[0]`. Aerodrome is still listed for Base, with the flag set to
`false`, so it remains available for routing and quotes while being structurally incapable of being
chosen for graduation.

## What this costs on Base, and what it buys on BNB

The V2-only choice has a real price, measured live:

| | Flagship V2 pool | TVL |
|---|---|---|
| Base / Uniswap V2 | WETH–USDC | ~$1.25M |
| BNB / PancakeSwap V2 | WBNB–USDT | ~$76.6M |

Base's genuine liquidity lives on Aerodrome and Uniswap V3/V4 — the venues this architecture
cannot use. Uniswap V2 on Base is comparatively thin. On BNB Chain, PancakeSwap V2 was never
displaced and remains a primary venue. A token graduating on BNB lands in far deeper water.

That is not an argument against Base, which has the better distribution funnel, but it is a real
trade-off to revisit if graduation depth becomes a complaint. The fix would be an Aerodrome path
with a *different* permanence proof — a lock contract holding the position, since Aerodrome pools
have no fungible LP token to burn. That is real work, not configuration.

## Deployment cost per chain

Measured live at ETH $2,449.57 / BNB $727.43, against 31,516,881 gas for a full deployment and
3,752,657 for one curve launch:

| Chain | Full deployment | Per token launch |
|---|---|---|
| Optimism | $0.08 | $0.0092 |
| Base | $0.54 | $0.0643 |
| BNB Chain | $1.15 | $0.1365 |
| Arbitrum | $1.85 | $0.2206 |
| Ethereum | $12.78 | $1.5214 |

L2 base fees swing hour to hour; treat the ordering among the L2s as noise and the gap to Ethereum
as structural. Ethereum is deliberately absent from the registry: at roughly 24× Base's cost it
makes the launch products uneconomic for the users they target.

## How the registry works

`packages/chain-registry/src/index.ts` is the single source of truth. Every chain is a
`ChainConfig` carrying its CAIP-2 id, native currency, RPC endpoints, explorer, capabilities,
block time, and its list of DEX deployments.

Selected helpers:

| Function | Purpose |
|---|---|
| `allChains()` / `mainnetChains()` / `testnetChains()` | enumerate |
| `getChain(id)` / `hasChain(id)` | look up by CAIP-2 |
| `defaultDex(id)` | the DEX graduation will use; throws if none qualifies |
| `poolCreationDexes(id)` | every DEX on the chain that can create a pool |
| `swapStrategy(id)` | `'aggregator'` where 0x serves the chain, `'direct-router'` otherwise |
| `registerDeployment(id, addresses)` / `getDeployment(id)` | contract addresses per chain |
| `registerChain(config)` | add a chain at runtime without a rebuild |

The invariant that `defaultDex()` never returns a DEX with `supportsV2PoolCreation: false` is
pinned by 21 tests in `registry.test.ts`. It is the test that would have caught the Aerodrome
defect, which is why it exists.

## Build-time chain separation

`apps/web/src/wagmi.ts` selects its chain set from the build mode:

```ts
const MAINNET = [base, bsc] as const;
const TESTNET = [bscTestnet, baseSepolia] as const;
const chains = CHAIN_MODE === 'testnet' ? TESTNET : MAINNET;
```

One build targets one chain set, so a production bundle does not offer testnets in its chain
switcher and a testnet build does not offer mainnets. Eight tests assert both modes.

To be precise about what this does and does not guarantee: it controls which chains the app will
*connect to and display*. It is not a network-level block — RPC endpoint strings for all four
chains are present in both bundles, because the registry is a single module. The guarantee is about
what the application will do, not about what the bytes contain.

## Adding a chain

1. Confirm the chain has a DEX meeting the constraint above. Probe it live — call
   `router.factory()`, then `factory.getPair(weth, someToken)`. If `getPair` reverts, stop.
2. Add a `ChainConfig` to `packages/chain-registry/src/index.ts` with the DEX entry and
   `supportsV2PoolCreation` set honestly.
3. Add the chain to `registry.test.ts`.
4. Run `scripts/preflight-deploy.mjs` against it — verifies chain id, deployer balance, router
   answers, and the two-argument `getPair`.
5. Deploy per `docs/DEPLOYMENT.md` and record the addresses.
6. Add it to `MAINNET` or `TESTNET` in `apps/web/src/wagmi.ts`.
