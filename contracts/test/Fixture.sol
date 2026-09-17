// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FeeRouter} from "../src/fees/FeeRouter.sol";
import {IFeeRouter} from "../src/fees/IFeeRouter.sol";
import {IUniswapV2Router02} from "../src/interfaces/IUniswapV2.sol";
import {BondingCurve} from "../src/launch/BondingCurve.sol";
import {BondingCurveFactory} from "../src/launch/BondingCurveFactory.sol";
import {LiquidityLocker} from "../src/liquidity/LiquidityLocker.sol";
import {TokenFactory} from "../src/tokens/TokenFactory.sol";
import {MockUniswapV2Factory, MockUniswapV2Router02, MockWETH} from "./mocks/UniswapV2.sol";
import {Test} from "forge-std/Test.sol";

/// @notice Shared deployment of the whole ecosystem, wired exactly as the deploy script wires it.
/// @dev Every suite builds on this so tests exercise the real topology - real fee router with real
///      caps, real curve implementation, real Uniswap V2 - rather than isolated contracts with
///      convenient stand-ins around them.
abstract contract Fixture is Test {
    FeeRouter internal feeRouter;
    TokenFactory internal tokenFactory;
    LiquidityLocker internal locker;
    BondingCurve internal curveImpl;
    BondingCurveFactory internal curveFactory;

    MockWETH internal weth;
    MockUniswapV2Factory internal dexFactory;
    MockUniswapV2Router02 internal dexRouter;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal creator = makeAddr("creator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint256 internal constant FLAT_CAP = 0.01 ether;
    uint64 internal constant TIMELOCK = 48 hours;

    // Launch parameters used across the suite.
    uint256 internal constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 internal constant CURVE_SUPPLY = 800_000_000e18;
    uint256 internal constant V_TOKEN_START = 1_073_000_000e18;
    uint256 internal constant V_NATIVE_START = 1.5 ether;
    uint64 internal constant ANTI_SNIPE_WINDOW = 60;
    uint256 internal constant MAX_BUY_IN_WINDOW = 0.5 ether;
    uint16 internal constant DEV_BUY_CAP_BPS = 2_000;

    function _deployEcosystem() internal {
        weth = new MockWETH();
        dexFactory = new MockUniswapV2Factory();
        dexRouter = new MockUniswapV2Router02(address(dexFactory), address(weth));

        feeRouter = new FeeRouter(owner, treasury, FLAT_CAP, TIMELOCK);
        tokenFactory = new TokenFactory(owner, feeRouter);
        locker = new LiquidityLocker();

        // The factory and the curve implementation each need the other's address. The factory
        // takes its implementation through a one-time setter, which is exactly how the deploy
        // script sequences it on a real chain.
        curveFactory = new BondingCurveFactory(owner, feeRouter, _defaultCurveConfig());
        curveImpl = new BondingCurve(
            address(curveFactory), feeRouter, IUniswapV2Router02(address(dexRouter)), locker
        );
        vm.prank(owner);
        curveFactory.setCurveImplementation(address(curveImpl));

        _configureFees();

        vm.deal(creator, 1_000 ether);
        vm.deal(alice, 1_000 ether);
        vm.deal(bob, 1_000 ether);
        vm.deal(carol, 1_000 ether);
    }

    function _defaultCurveConfig() internal pure returns (BondingCurveFactory.CurveConfig memory) {
        return BondingCurveFactory.CurveConfig({
            totalSupply: TOTAL_SUPPLY,
            curveSupply: CURVE_SUPPLY,
            virtualNativeStart: V_NATIVE_START,
            virtualTokenStart: V_TOKEN_START,
            antiSnipeWindow: ANTI_SNIPE_WINDOW,
            maxBuyDuringWindow: MAX_BUY_IN_WINDOW,
            devBuyCapBps: DEV_BUY_CAP_BPS
        });
    }

    function _configureFees() internal {
        _setFee(IFeeRouter.Product.TokenDeploy, 0, 0, 0.002 ether);
        _setFee(IFeeRouter.Product.BondingCurveTrade, 100, 5_000, 0); // 1% total, half to creator
        _setFee(IFeeRouter.Product.Graduation, 0, 0, 0.003 ether);
        _setFee(IFeeRouter.Product.Swap, 25, 0, 0);
        _setFee(IFeeRouter.Product.Presale, 200, 0, 0);
        _setFee(IFeeRouter.Product.FairLaunch, 100, 0, 0);
        _setFee(IFeeRouter.Product.NftDeploy, 0, 0, 0.001 ether);
        _setFee(IFeeRouter.Product.NftMint, 100, 0, 0);
        _setFee(IFeeRouter.Product.NftMarketplace, 50, 0, 0);
    }

    function _setFee(IFeeRouter.Product p, uint16 bps, uint16 creatorShareBps, uint128 flat) internal {
        vm.startPrank(owner);
        feeRouter.proposeFeeConfig(
            p, IFeeRouter.FeeConfig({bps: bps, creatorShareBps: creatorShareBps, flatNative: flat})
        );
        vm.stopPrank();
        vm.warp(block.timestamp + TIMELOCK);
        vm.prank(owner);
        feeRouter.executeFeeConfig(p);
    }

    function _launch(address who, string memory name, string memory symbol, uint256 devBuy)
        internal
        returns (BondingCurve curve, address token)
    {
        uint256 deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        vm.prank(who);
        (address c, address t) = curveFactory.launch{value: deployFee + devBuy}(
            BondingCurveFactory.LaunchParams({
                name: name,
                symbol: symbol,
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0,
                devBuyValue: devBuy,
                devBuyMinTokensOut: 0,
                salt: keccak256(abi.encodePacked(name, symbol, who))
            })
        );
        return (BondingCurve(payable(c)), t);
    }
}
