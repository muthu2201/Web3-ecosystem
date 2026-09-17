// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../../src/fees/IFeeRouter.sol";
import {BondingCurve} from "../../../src/launch/BondingCurve.sol";
import {BondingCurveFactory} from "../../../src/launch/BondingCurveFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

/// @notice Drives bonding curves through randomised buy/sell/time sequences.
///
/// @dev Two design choices keep the exploration deep rather than merely long:
///
///      1. RELAUNCH. A graduated curve accepts no further trades, so without this the fuzzer
///         would spend the overwhelming majority of a run calling into a dead contract and the
///         invariants would pass vacuously. When the live curve graduates the handler launches a
///         fresh one, so every run keeps exercising live-curve accounting - and incidentally
///         exercises many launches rather than one.
///      2. SMALL TRADES. Buys are bounded well below the graduation target, so a curve takes many
///         interleaved buys and sells to fill instead of completing in one or two calls.
///
///      Calls are wrapped in try/catch so a legitimate revert (slippage, anti-snipe cap) advances
///      the run instead of ending it.
contract CurveHandler is CommonBase, StdCheats, StdUtils {
    BondingCurveFactory public immutable factory;
    IFeeRouter public immutable feeRouter;
    address public immutable creator;

    BondingCurve public curve;
    IERC20 public token;

    address[] public actors;

    // Ghost accounting, maintained independently of the contracts' own bookkeeping.
    uint256 public ghostNativeIn;
    uint256 public ghostNativeOut;
    uint256 public buyCount;
    uint256 public sellCount;
    uint256 public launchCount;
    uint256 public graduationCount;

    constructor(BondingCurveFactory factory_, IFeeRouter feeRouter_, address creator_, address[] memory actors_) {
        factory = factory_;
        feeRouter = feeRouter_;
        creator = creator_;
        actors = actors_;
        _launch();
    }

    function _launch() internal {
        uint256 fee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        vm.deal(creator, creator.balance + fee);
        vm.prank(creator);
        (address c, address t) = factory.launch{value: fee}(
            BondingCurveFactory.LaunchParams({
                name: "Inv",
                symbol: "INV",
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0,
                devBuyValue: 0,
                devBuyMinTokensOut: 0,
                salt: keccak256(abi.encode("invariant", launchCount))
            })
        );
        curve = BondingCurve(payable(c));
        token = IERC20(t);
        launchCount++;
    }

    /// @dev Replaces a graduated curve so the run keeps exercising live state.
    function _rotateIfGraduated() internal {
        if (curve.graduated()) {
            graduationCount++;
            _launch();
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function buy(uint256 actorSeed, uint256 amount) public {
        _rotateIfGraduated();
        address actor = _actor(actorSeed);
        // Sized against the ~4.4 ether graduation target: large enough that a campaign reaches
        // graduation (and therefore exercises the migration path) within its call depth, small
        // enough that a curve takes many interleaved buys and sells to fill rather than
        // completing in one call. `afterInvariant` asserts graduation really was reached, so if
        // this bound ever drifts out of range the suite fails loudly instead of going vacuous.
        amount = bound(amount, 1e12, 2 ether);
        vm.deal(actor, actor.balance + amount);

        uint256 balanceBefore = actor.balance;
        vm.prank(actor);
        try curve.buy{value: amount}(0, block.timestamp + 1) {
            ghostNativeIn += balanceBefore - actor.balance;
            buyCount++;
        } catch {
            // anti-snipe cap or slippage - legitimate outcomes
        }
    }

    function sell(uint256 actorSeed, uint256 pct) public {
        _rotateIfGraduated();
        address actor = _actor(actorSeed);
        uint256 held = token.balanceOf(actor);
        if (held == 0) return;

        uint256 amount = (held * bound(pct, 1, 100)) / 100;
        if (amount == 0) return;

        uint256 balanceBefore = actor.balance;
        vm.startPrank(actor);
        token.approve(address(curve), amount);
        try curve.sell(amount, 0, block.timestamp + 1) {
            ghostNativeOut += actor.balance - balanceBefore;
            sellCount++;
        } catch {
            // insufficient reserve or slippage
        }
        vm.stopPrank();
    }

    /// @dev Lets a run cross the anti-snipe window boundary.
    function advanceTime(uint256 secondsToSkip) public {
        vm.warp(vm.getBlockTimestamp() + bound(secondsToSkip, 1, 7 days));
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }
}
