// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {IUniswapV2Pair} from "../../src/interfaces/IUniswapV2.sol";
import {BondingCurve} from "../../src/launch/BondingCurve.sol";
import {BondingCurveFactory} from "../../src/launch/BondingCurveFactory.sol";
import {IPlatformToken, RiskFlags} from "../../src/tokens/IPlatformToken.sol";
import {Fixture} from "../Fixture.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BondingCurveTest is Fixture {
    BondingCurve internal curve;
    address internal token;

    function setUp() public {
        _deployEcosystem();
        (curve, token) = _launch(creator, "Degen", "DGN", 0);
    }

    function _buy(address who, uint256 value) internal returns (uint256) {
        vm.prank(who);
        return curve.buy{value: value}(0, block.timestamp + 1);
    }

    // -----------------------------------------------------------------
    // Launch
    // -----------------------------------------------------------------

    function test_LaunchMintsEntireSupplyIntoCurve() public view {
        assertEq(IERC20(token).totalSupply(), TOTAL_SUPPLY);
        assertEq(IERC20(token).balanceOf(address(curve)), TOTAL_SUPPLY, "no intermediate holder");
        assertEq(curve.creator(), creator);
        assertEq(curve.curveSupply(), CURVE_SUPPLY);
        assertEq(curve.lpSupply(), TOTAL_SUPPLY - CURVE_SUPPLY);
    }

    /// @dev A degen launch must never be able to produce a token with admin powers.
    function test_LaunchedTokenHasNoAdminPowers() public view {
        assertEq(IPlatformToken(token).riskFlags(), RiskFlags.NONE);
        assertEq(IPlatformToken(token).templateId(), keccak256("web3eco.token.standard.v1"));
    }

    function test_PairIsCreatedAtLaunchSoItCannotBeFrontRun() public view {
        assertTrue(curve.pair() != address(0), "pair must exist from the start");
        assertEq(dexFactory.getPair(token, address(weth)), curve.pair());
        assertFalse(curve.poolPreSeeded());
    }

    function test_PredictedCurveAddressMatchesActual() public {
        bytes32 salt = keccak256("predict-me");
        address predicted = curveFactory.predictCurveAddress(alice, salt);
        uint256 fee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        vm.prank(alice);
        (address actual,) = curveFactory.launch{value: fee}(
            BondingCurveFactory.LaunchParams({
                name: "Pred",
                symbol: "PRD",
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0,
                devBuyValue: 0,
                devBuyMinTokensOut: 0,
                salt: salt
            })
        );
        assertEq(actual, predicted, "UI must be able to show the address before signing");
    }

    function test_ImplementationItselfCannotBeInitialized() public {
        vm.expectRevert(BondingCurve.AlreadyInitialized.selector);
        curveImpl.initialize(
            BondingCurve.Params({
                token: token,
                creator: creator,
                curveSupply: 1,
                lpSupply: 1,
                virtualNativeStart: 1,
                virtualTokenStart: 2,
                antiSnipeWindow: 0,
                maxBuyDuringWindow: 0,
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0
            })
        );
    }

    function test_CurveCannotBeReinitialized() public {
        vm.expectRevert(BondingCurve.AlreadyInitialized.selector);
        curve.initialize(
            BondingCurve.Params({
                token: token,
                creator: alice,
                curveSupply: 1,
                lpSupply: 1,
                virtualNativeStart: 1,
                virtualTokenStart: 2,
                antiSnipeWindow: 0,
                maxBuyDuringWindow: 0,
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0
            })
        );
    }

    // -----------------------------------------------------------------
    // Core invariants
    // -----------------------------------------------------------------

    /// @dev The curve's native balance must equal its tracked reserve exactly, always. Any drift
    ///      means either it is holding money it has not accounted for, or it has promised money
    ///      it does not hold.
    function testFuzz_BalanceAlwaysEqualsTrackedReserve(uint96 a, uint96 b, uint96 c) public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256[3] memory amounts = [bound(a, 1e12, 1 ether), bound(b, 1e12, 1 ether), bound(c, 1e12, 1 ether)];
        address[3] memory buyers = [alice, bob, carol];

        for (uint256 i; i < 3; ++i) {
            _buy(buyers[i], amounts[i]);
            assertEq(address(curve).balance, curve.realNativeReserve(), "balance tracks reserve");
        }

        for (uint256 i; i < 3; ++i) {
            uint256 bal = IERC20(token).balanceOf(buyers[i]);
            if (bal == 0) continue;
            vm.startPrank(buyers[i]);
            IERC20(token).approve(address(curve), bal);
            curve.sell(bal, 0, block.timestamp + 1);
            vm.stopPrank();
            assertEq(address(curve).balance, curve.realNativeReserve(), "balance tracks reserve");
        }
    }

    /// @dev Virtual native reserve must stay exactly one starting-offset above the real reserve.
    function testFuzz_VirtualReserveTracksRealReserve(uint96 amount) public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        _buy(alice, bound(amount, 1e12, 2 ether));
        assertEq(
            curve.virtualNativeReserve() - V_NATIVE_START,
            curve.realNativeReserve(),
            "virtual and real reserves must stay in lockstep"
        );
    }

    /// @dev Buying and immediately selling must lose money, on-chain, including fees.
    function testFuzz_RoundTripOnChainIsNeverProfitable(uint96 amount) public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 spend = bound(amount, 1e13, 3 ether);

        uint256 before = alice.balance;
        uint256 got = _buy(alice, spend);
        vm.assume(got > 0);

        vm.startPrank(alice);
        IERC20(token).approve(address(curve), got);
        curve.sell(got, 0, block.timestamp + 1);
        vm.stopPrank();

        assertLe(alice.balance, before, "round trip must never profit the trader");
    }

    // -----------------------------------------------------------------
    // Buying
    // -----------------------------------------------------------------

    function test_BuyDeliversTokensAndRoutesFee() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 spend = 1 ether;
        uint256 expectedFee = (spend * 100) / 10_000; // 1%

        (uint256 quoted,) = curve.quoteBuy(spend);
        // The treasury already holds this launch's flat deploy fee, so compare deltas.
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));
        uint256 creatorBefore = feeRouter.balanceOf(creator, address(0));

        uint256 got = _buy(alice, spend);

        assertEq(got, quoted, "quote must match execution exactly");
        assertEq(IERC20(token).balanceOf(alice), got);
        assertEq(curve.realNativeReserve(), spend - expectedFee);
        // Fee split 50/50 between creator and treasury.
        assertEq(feeRouter.balanceOf(creator, address(0)) - creatorBefore, expectedFee / 2);
        assertEq(feeRouter.balanceOf(treasury, address(0)) - treasuryBefore, expectedFee / 2);
    }

    function test_BuyRespectsSlippageBound() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        (uint256 quoted,) = curve.quoteBuy(1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BondingCurve.SlippageExceeded.selector, quoted, quoted + 1));
        curve.buy{value: 1 ether}(quoted + 1, block.timestamp + 1);
    }

    function test_BuyRespectsDeadline() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 past = block.timestamp - 1;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BondingCurve.DeadlinePassed.selector, past));
        curve.buy{value: 1 ether}(0, past);
    }

    function test_BuyRejectsZeroValue() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        vm.prank(alice);
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        curve.buy{value: 0}(0, block.timestamp + 1);
    }

    /// @dev Native sent directly must be rejected, so nobody can shift the price or force an
    ///      early graduation by donating.
    function test_DirectNativeTransferIsRejected() public {
        vm.prank(alice);
        (bool ok,) = address(curve).call{value: 5 ether}("");
        assertFalse(ok, "curve must reject unaccounted native currency");
    }

    // -----------------------------------------------------------------
    // Anti-snipe
    // -----------------------------------------------------------------

    function test_AntiSnipeCapsPerWalletDuringWindow() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                BondingCurve.AntiSnipeCapExceeded.selector, MAX_BUY_IN_WINDOW + 1 wei, MAX_BUY_IN_WINDOW
            )
        );
        curve.buy{value: MAX_BUY_IN_WINDOW + 1 wei}(0, block.timestamp + 1);
    }

    function test_AntiSnipeCapIsCumulativeNotPerTransaction() public {
        _buy(alice, MAX_BUY_IN_WINDOW / 2);
        vm.prank(alice);
        vm.expectRevert();
        curve.buy{value: (MAX_BUY_IN_WINDOW / 2) + 1}(0, block.timestamp + 1);
    }

    function test_AntiSnipeLiftsAfterWindow() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 got = _buy(alice, MAX_BUY_IN_WINDOW * 3);
        assertGt(got, 0, "cap must not apply once the window has passed");
    }

    /// @dev Regression: dev buys are relayed by the factory. If the factory shared the per-wallet
    ///      bucket, a dev buy above the window cap would silently truncate.
    function test_DevBuyIsNotMeteredAgainstTheAntiSnipeBucket() public {
        // Above the per-wallet window cap (0.5) but under the dev-buy cap (~0.879), so the only
        // thing that could block it is the anti-snipe bucket.
        uint256 devBuy = 0.7 ether;
        assertGt(devBuy, MAX_BUY_IN_WINDOW);
        assertLt(devBuy, (curveFactory.graduationTargetForNewLaunch() * DEV_BUY_CAP_BPS) / 10_000);
        (BondingCurve c2, address t2) = _launch(creator, "DevBuy", "DVB", devBuy);
        assertGt(IERC20(t2).balanceOf(creator), 0, "creator received their dev buy");
        assertGt(c2.realNativeReserve(), MAX_BUY_IN_WINDOW, "full dev buy landed on the curve");
    }

    function test_DevBuyAboveCapReverts() public {
        uint256 target = curveFactory.graduationTargetForNewLaunch();
        uint256 cap = (target * DEV_BUY_CAP_BPS) / 10_000;
        uint256 deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BondingCurveFactory.DevBuyExceedsCap.selector, cap + 1, cap));
        curveFactory.launch{value: deployFee + cap + 1}(
            BondingCurveFactory.LaunchParams({
                name: "TooBig",
                symbol: "BIG",
                lockLpInsteadOfBurn: false,
                lpLockDuration: 0,
                devBuyValue: cap + 1,
                devBuyMinTokensOut: 0,
                salt: keccak256("toobig")
            })
        );
    }

    // -----------------------------------------------------------------
    // Selling
    // -----------------------------------------------------------------

    function test_SellReturnsNativeAndChargesFee() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 got = _buy(alice, 1 ether);

        (uint256 expectedOut,) = curve.quoteSell(got);
        uint256 before = alice.balance;

        vm.startPrank(alice);
        IERC20(token).approve(address(curve), got);
        uint256 out = curve.sell(got, 0, block.timestamp + 1);
        vm.stopPrank();

        assertEq(out, expectedOut, "quote must match execution");
        assertEq(alice.balance, before + out);
        assertEq(IERC20(token).balanceOf(alice), 0);
    }

    function test_SellRespectsSlippageBound() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        uint256 got = _buy(alice, 1 ether);
        (uint256 expectedOut,) = curve.quoteSell(got);

        vm.startPrank(alice);
        IERC20(token).approve(address(curve), got);
        vm.expectRevert(abi.encodeWithSelector(BondingCurve.SlippageExceeded.selector, expectedOut, expectedOut + 1));
        curve.sell(got, expectedOut + 1, block.timestamp + 1);
        vm.stopPrank();
    }

    function test_CannotSellMoreThanEverSold() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        _buy(alice, 1 ether);
        uint256 sold = curve.tokensSold();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BondingCurve.InsufficientTokenBalance.selector, sold, sold + 1));
        curve.sell(sold + 1, 0, block.timestamp + 1);
    }

    // -----------------------------------------------------------------
    // Graduation
    // -----------------------------------------------------------------

    function _buyOutTheCurve() internal {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        // Walk the curve up in chunks, then finish with a deliberate overpay to exercise the
        // partial-fill and refund path.
        for (uint256 i; i < 6 && !curve.graduated(); ++i) {
            _buy(alice, 1 ether);
        }
        if (!curve.graduated()) _buy(bob, 50 ether);
    }

    function test_GraduationMovesLiquidityIntoPoolAndBurnsLp() public {
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));
        _buyOutTheCurve();

        assertTrue(curve.graduated(), "curve must graduate when its supply is exhausted");
        assertEq(curve.tokensSold(), CURVE_SUPPLY);
        assertEq(curve.realNativeReserve(), 0, "everything moved to the pool");
        assertEq(address(curve).balance, 0, "no native left behind");
        assertEq(IERC20(token).balanceOf(address(curve)), 0, "no tokens left behind");

        IUniswapV2Pair pair = IUniswapV2Pair(curve.pair());
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertGt(r0, 0);
        assertGt(r1, 0);

        // All LP is burned: the dead address holds everything except the pair's own minimum.
        assertEq(pair.balanceOf(curve.BURN_ADDRESS()), pair.totalSupply(), "LP fully burned");
        assertGt(feeRouter.balanceOf(treasury, address(0)), treasuryBefore, "graduation fee collected");
    }

    function test_TradingIsClosedAfterGraduation() public {
        _buyOutTheCurve();
        vm.prank(alice);
        vm.expectRevert(BondingCurve.AlreadyGraduated.selector);
        curve.buy{value: 1 ether}(0, block.timestamp + 1);

        vm.prank(alice);
        vm.expectRevert(BondingCurve.AlreadyGraduated.selector);
        curve.sell(1e18, 0, block.timestamp + 1);
    }

    /// @dev The final buy is overpaid on purpose; the excess must come back rather than being
    ///      absorbed as an oversized fee.
    function test_FinalBuyRefundsOverpayment() public {
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        // The curve completes at ~4.4 ether of net inflow, so four 1-ether buys leave it close to
        // full but not graduated - which is the state the overpay path needs to be exercised in.
        for (uint256 i; i < 4; ++i) {
            _buy(alice, 1 ether);
        }
        assertFalse(curve.graduated(), "setup should leave the curve nearly full");

        uint256 before = bob.balance;
        uint256 overpay = 100 ether;
        uint256 got = _buy(bob, overpay);

        assertTrue(curve.graduated());
        assertGt(got, 0);
        uint256 actuallySpent = before - bob.balance;
        assertLt(actuallySpent, overpay, "unused native must be refunded");
    }

    function test_GraduationTargetIsKnownBeforeAnyTrade() public view {
        uint256 target = curve.graduationTarget();
        assertGt(target, 0);
        assertApproxEqRel(target, 4.4 ether, 0.05e18);
    }

    function test_LockLpInsteadOfBurn() public {
        uint256 deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        vm.prank(creator);
        (address c,) = curveFactory.launch{value: deployFee}(
            BondingCurveFactory.LaunchParams({
                name: "Locked",
                symbol: "LCK",
                lockLpInsteadOfBurn: true,
                lpLockDuration: 365 days,
                devBuyValue: 0,
                devBuyMinTokensOut: 0,
                salt: keccak256("locked")
            })
        );
        BondingCurve c2 = BondingCurve(payable(c));

        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);
        for (uint256 i; i < 6 && !c2.graduated(); ++i) {
            vm.prank(alice);
            c2.buy{value: 1 ether}(0, block.timestamp + 1);
        }
        if (!c2.graduated()) {
            vm.prank(bob);
            c2.buy{value: 50 ether}(0, block.timestamp + 1);
        }

        assertTrue(c2.graduated());
        uint256[] memory ids = locker.lockIdsOfOwner(creator);
        assertEq(ids.length, 1, "LP locked to the creator");
        assertGt(locker.getLock(ids[0]).amount, 0);
        assertFalse(locker.isUnlocked(ids[0]), "lock must not be immediately withdrawable");
    }

    function test_LockDurationBelowMinimumReverts() public {
        uint256 deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(BondingCurveFactory.LockDurationTooShort.selector, uint64(1 days), uint64(30 days))
        );
        curveFactory.launch{value: deployFee}(
            BondingCurveFactory.LaunchParams({
                name: "Short",
                symbol: "SHT",
                lockLpInsteadOfBurn: true,
                lpLockDuration: 1 days,
                devBuyValue: 0,
                devBuyMinTokensOut: 0,
                salt: keccak256("short")
            })
        );
    }

    // -----------------------------------------------------------------
    // Fee ceiling holds end to end
    // -----------------------------------------------------------------

    /// @dev Even with the owner pushing the curve fee to its ceiling, a trader can never be
    ///      charged more than 1.5%.
    function test_CurveFeeCannotExceedOnePointFivePercentEndToEnd() public {
        _setFee(IFeeRouter.Product.BondingCurveTrade, 150, 5000, 0);
        vm.warp(block.timestamp + ANTI_SNIPE_WINDOW + 1);

        uint256 spend = 2 ether;
        uint256 feesBefore = feeRouter.balanceOf(creator, address(0)) + feeRouter.balanceOf(treasury, address(0));
        _buy(alice, spend);
        uint256 charged =
            feeRouter.balanceOf(creator, address(0)) + feeRouter.balanceOf(treasury, address(0)) - feesBefore;

        assertEq(charged, (spend * 150) / 10_000);
        assertLe(charged * 10_000 / spend, 150, "hard ceiling holds through the full path");
    }
}
