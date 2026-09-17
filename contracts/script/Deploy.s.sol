// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MerkleDistributor} from "../src/distribution/MerkleDistributor.sol";
import {TokenVesting} from "../src/distribution/TokenVesting.sol";
import {FeeRouter} from "../src/fees/FeeRouter.sol";
import {IUniswapV2Router02} from "../src/interfaces/IUniswapV2.sol";
import {BondingCurve} from "../src/launch/BondingCurve.sol";
import {BondingCurveFactory} from "../src/launch/BondingCurveFactory.sol";
import {Presale} from "../src/launch/Presale.sol";
import {PresaleFactory} from "../src/launch/PresaleFactory.sol";
import {LiquidityLocker} from "../src/liquidity/LiquidityLocker.sol";
import {NftFactory} from "../src/nft/NftFactory.sol";
import {NftMarketplace} from "../src/nft/NftMarketplace.sol";
import {TokenFactory} from "../src/tokens/TokenFactory.sol";
import {
    ComplianceTokenDeployer,
    GovernanceTokenDeployer,
    MintableTokenDeployer,
    PausableTokenDeployer,
    StandardTokenDeployer,
    TaxTokenDeployer
} from "../src/tokens/deployers/TokenDeployers.sol";
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

/// @title Deploy
/// @notice Deploys the full ecosystem to one chain and prints an address manifest.
///
/// @dev ORDERING MATTERS. `BondingCurveFactory` and `BondingCurve` each need the other's address.
///      The factory takes its implementation through a set-once setter, so the sequence is:
///      deploy factory, deploy implementation against it, bind, and the binding can never be
///      changed again. Same for the presale pair.
///
/// @dev FEES ARE NOT SET HERE. Every fee starts at zero and must be proposed and executed through
///      the router's timelock by the Safe. That means a freshly deployed ecosystem charges
///      nothing until a multisig has explicitly, publicly and with notice turned fees on - there
///      is no window where a deploy script silently sets a rate nobody reviewed.
contract Deploy is Script {
    struct Config {
        address safe; // owner and treasury: a Safe multisig
        address dexRouter; // Uniswap V2 or PancakeSwap V2 router ONLY - see IUniswapV2.sol
        uint256 flatNativeHardCap; // per-chain ceiling for flat fees
        uint64 timelockDelay;
    }

    struct Deployment {
        FeeRouter feeRouter;
        TokenFactory tokenFactory;
        LiquidityLocker locker;
        BondingCurve curveImplementation;
        BondingCurveFactory curveFactory;
        Presale presaleImplementation;
        PresaleFactory presaleFactory;
        TokenVesting vesting;
        MerkleDistributor distributor;
        NftFactory nftFactory;
        NftMarketplace marketplace;
    }

    function run() external returns (Deployment memory d) {
        Config memory cfg = Config({
            safe: vm.envAddress("SAFE_ADDRESS"),
            dexRouter: vm.envAddress("DEX_ROUTER"),
            flatNativeHardCap: vm.envOr("FLAT_NATIVE_HARD_CAP", uint256(0.01 ether)),
            timelockDelay: uint64(vm.envOr("TIMELOCK_DELAY", uint256(48 hours)))
        });

        vm.startBroadcast();
        d = _deploy(cfg);
        vm.stopBroadcast();

        _report(d, cfg);
    }

    /// @notice Deploy without broadcasting. Used by tests and the stress harness.
    function deployFor(Config memory cfg) external returns (Deployment memory) {
        return _deploy(cfg);
    }

    function _deploy(Config memory cfg) internal returns (Deployment memory d) {
        require(cfg.safe != address(0), "SAFE_ADDRESS required");
        require(cfg.dexRouter != address(0), "DEX_ROUTER required");

        d.feeRouter = new FeeRouter(cfg.safe, cfg.safe, cfg.flatNativeHardCap, cfg.timelockDelay);
        d.locker = new LiquidityLocker();
        d.tokenFactory = new TokenFactory(cfg.safe, d.feeRouter);
        d.vesting = new TokenVesting();
        d.distributor = new MerkleDistributor();
        d.nftFactory = new NftFactory(cfg.safe, d.feeRouter);
        d.marketplace = new NftMarketplace(d.feeRouter);

        // Curve: factory first, implementation second, then a one-way binding.
        d.curveFactory = new BondingCurveFactory(cfg.safe, d.feeRouter, _defaultCurveConfig());
        d.curveImplementation =
            new BondingCurve(address(d.curveFactory), d.feeRouter, IUniswapV2Router02(cfg.dexRouter), d.locker);

        // Presale: same shape.
        d.presaleFactory = new PresaleFactory(cfg.safe, d.feeRouter);
        d.presaleImplementation =
            new Presale(address(d.presaleFactory), d.feeRouter, IUniswapV2Router02(cfg.dexRouter), d.locker);
    }

    /// @notice Bind the implementations and token deployers. Separate from `_deploy` because on a
    ///         live chain these are executed by the Safe, not by the deployer key.
    /// @dev Every binding here is one-way. Once set, no owner action can change the code a future
    ///      launch or token deployment runs on.
    function bindImplementations(Deployment memory d) external {
        d.curveFactory.setCurveImplementation(address(d.curveImplementation));
        d.presaleFactory.setPresaleImplementation(address(d.presaleImplementation));
        d.tokenFactory
            .bindDeployers(
                new StandardTokenDeployer(address(d.tokenFactory)),
                new MintableTokenDeployer(address(d.tokenFactory)),
                new PausableTokenDeployer(address(d.tokenFactory)),
                new GovernanceTokenDeployer(address(d.tokenFactory)),
                new TaxTokenDeployer(address(d.tokenFactory)),
                new ComplianceTokenDeployer(address(d.tokenFactory))
            );
    }

    /// @notice Launch parameters for new curves.
    /// @dev 1B supply, 80% sold on the curve and 20% paired into the pool at graduation. The
    ///      virtual token reserve exceeds the curve supply, so the final buy has a finite price
    ///      and graduation is always reachable. With a 1.5 ether virtual seed this completes at
    ///      roughly 4.4 ether of net inflow, which is knowable before the first trade.
    function _defaultCurveConfig() internal pure returns (BondingCurveFactory.CurveConfig memory) {
        return BondingCurveFactory.CurveConfig({
            totalSupply: 1_000_000_000e18,
            curveSupply: 800_000_000e18,
            virtualNativeStart: 1.5 ether,
            virtualTokenStart: 1_073_000_000e18,
            antiSnipeWindow: 60,
            maxBuyDuringWindow: 0.5 ether,
            devBuyCapBps: 2000
        });
    }

    function _report(Deployment memory d, Config memory cfg) internal pure {
        console.log("=== Web3 Ecosystem deployment ===");
        console.log("safe/treasury       ", cfg.safe);
        console.log("dexRouter           ", cfg.dexRouter);
        console.log("FeeRouter           ", address(d.feeRouter));
        console.log("TokenFactory        ", address(d.tokenFactory));
        console.log("LiquidityLocker     ", address(d.locker));
        console.log("BondingCurve (impl) ", address(d.curveImplementation));
        console.log("BondingCurveFactory ", address(d.curveFactory));
        console.log("Presale (impl)      ", address(d.presaleImplementation));
        console.log("PresaleFactory      ", address(d.presaleFactory));
        console.log("TokenVesting        ", address(d.vesting));
        console.log("MerkleDistributor   ", address(d.distributor));
        console.log("NftFactory          ", address(d.nftFactory));
        console.log("NftMarketplace      ", address(d.marketplace));
        console.log("");
        console.log("NEXT STEPS (all from the Safe):");
        console.log("1. curveFactory.setCurveImplementation(...) and tokenFactory.bindDeployers(...)");
        console.log("2. presaleFactory.setPresaleImplementation(...)");
        console.log("3. feeRouter.proposeFeeConfig(...) for each product, then execute after the timelock");
        console.log("All fees are ZERO until step 3 completes.");
    }
}
