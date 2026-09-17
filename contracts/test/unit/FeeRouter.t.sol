// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FeeRouter} from "../../src/fees/FeeRouter.sol";
import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {FeeOnTransferERC20, MockERC20, RejectsNative} from "../mocks/MockERC20.sol";
import {ReentrantWithdrawer} from "../mocks/ReentrantWithdrawer.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Test} from "forge-std/Test.sol";

contract FeeRouterTest is Test {
    FeeRouter internal router;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal creator = makeAddr("creator");
    address internal payer = makeAddr("payer");

    uint256 internal constant FLAT_CAP = 0.01 ether;
    uint64 internal constant DELAY = 48 hours;

    function setUp() public {
        router = new FeeRouter(owner, treasury, FLAT_CAP, DELAY);
        vm.deal(payer, 1_000 ether);
    }

    function _setConfig(IFeeRouter.Product p, uint16 bps, uint16 creatorShareBps, uint128 flat) internal {
        vm.startPrank(owner);
        router.proposeFeeConfig(
            p, IFeeRouter.FeeConfig({bps: bps, creatorShareBps: creatorShareBps, flatNative: flat})
        );
        vm.warp(block.timestamp + DELAY);
        router.executeFeeConfig(p);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------
    // Hard caps
    // -----------------------------------------------------------------

    function test_HardCapsMatchPublishedSchedule() public view {
        assertEq(router.maxBps(IFeeRouter.Product.BondingCurveTrade), 150);
        assertEq(router.maxBps(IFeeRouter.Product.Swap), 100);
        assertEq(router.maxBps(IFeeRouter.Product.Presale), 300);
        assertEq(router.maxBps(IFeeRouter.Product.FairLaunch), 200);
        assertEq(router.maxBps(IFeeRouter.Product.NftMint), 200);
        assertEq(router.maxBps(IFeeRouter.Product.NftMarketplace), 100);
        assertEq(router.maxBps(IFeeRouter.Product.TokenDeploy), 0);
        assertEq(router.maxBps(IFeeRouter.Product.Graduation), 0);
        assertEq(router.maxBps(IFeeRouter.Product.NftDeploy), 0);
    }

    /// @dev The headline promise: no owner action can push any product above its cap.
    function testFuzz_CannotProposeAboveCap(uint8 rawProduct, uint16 bps) public {
        IFeeRouter.Product p = IFeeRouter.Product(bound(rawProduct, 0, 8));
        uint16 cap = router.maxBps(p);
        bps = uint16(bound(bps, uint256(cap) + 1, type(uint16).max));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IFeeRouter.FeeExceedsHardCap.selector, bps, cap));
        router.proposeFeeConfig(
            p, IFeeRouter.FeeConfig({bps: bps, creatorShareBps: 0, flatNative: 0})
        );
    }

    function testFuzz_CanProposeAtOrBelowCap(uint8 rawProduct, uint16 bps) public {
        IFeeRouter.Product p = IFeeRouter.Product(bound(rawProduct, 0, 8));
        uint16 cap = router.maxBps(p);
        bps = uint16(bound(bps, 0, cap));

        vm.prank(owner);
        router.proposeFeeConfig(p, IFeeRouter.FeeConfig({bps: bps, creatorShareBps: 0, flatNative: 0}));
        (IFeeRouter.FeeConfig memory cfg,) = router.pendingFeeConfig(p);
        assertEq(cfg.bps, bps);
    }

    function testFuzz_CannotProposeFlatAboveChainCap(uint128 flat) public {
        flat = uint128(bound(flat, FLAT_CAP + 1, type(uint128).max));
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IFeeRouter.FeeExceedsHardCap.selector, flat, FLAT_CAP));
        router.proposeFeeConfig(
            IFeeRouter.Product.TokenDeploy,
            IFeeRouter.FeeConfig({bps: 0, creatorShareBps: 0, flatNative: flat})
        );
    }

    function test_ConstructorRejectsFlatCapAboveAbsoluteCeiling() public {
        uint256 tooBig = router.ABSOLUTE_FLAT_NATIVE_CEILING() + 1;
        vm.expectRevert(
            abi.encodeWithSelector(
                IFeeRouter.FeeExceedsHardCap.selector, tooBig, router.ABSOLUTE_FLAT_NATIVE_CEILING()
            )
        );
        new FeeRouter(owner, treasury, tooBig, DELAY);
    }

    function test_ConstructorRejectsOutOfRangeDelay() public {
        vm.expectRevert();
        new FeeRouter(owner, treasury, FLAT_CAP, 1 hours);
        vm.expectRevert();
        new FeeRouter(owner, treasury, FLAT_CAP, 31 days);
    }

    // -----------------------------------------------------------------
    // Timelock
    // -----------------------------------------------------------------

    function test_ExecuteBeforeEtaReverts() public {
        vm.startPrank(owner);
        router.proposeFeeConfig(
            IFeeRouter.Product.Swap, IFeeRouter.FeeConfig({bps: 25, creatorShareBps: 0, flatNative: 0})
        );
        (, uint64 eta) = router.pendingFeeConfig(IFeeRouter.Product.Swap);
        vm.warp(eta - 1);
        vm.expectRevert(abi.encodeWithSelector(IFeeRouter.TimelockNotElapsed.selector, eta));
        router.executeFeeConfig(IFeeRouter.Product.Swap);
        vm.stopPrank();
    }

    function test_ExecuteAtEtaSucceeds() public {
        _setConfig(IFeeRouter.Product.Swap, 25, 0, 0);
        assertEq(router.bpsOf(IFeeRouter.Product.Swap), 25);
    }

    function test_ExecuteWithoutProposalReverts() public {
        vm.prank(owner);
        vm.expectRevert(IFeeRouter.NoPendingProposal.selector);
        router.executeFeeConfig(IFeeRouter.Product.Swap);
    }

    function test_CancelClearsProposal() public {
        vm.startPrank(owner);
        router.proposeFeeConfig(
            IFeeRouter.Product.Swap, IFeeRouter.FeeConfig({bps: 25, creatorShareBps: 0, flatNative: 0})
        );
        router.cancelFeeConfig(IFeeRouter.Product.Swap);
        vm.warp(block.timestamp + DELAY);
        vm.expectRevert(IFeeRouter.NoPendingProposal.selector);
        router.executeFeeConfig(IFeeRouter.Product.Swap);
        vm.stopPrank();
    }

    function test_OnlyOwnerCanPropose() public {
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, payer));
        router.proposeFeeConfig(
            IFeeRouter.Product.Swap, IFeeRouter.FeeConfig({bps: 25, creatorShareBps: 0, flatNative: 0})
        );
    }

    /// @dev A fee cut helps users immediately, so it skips the timelock - but the same path must
    ///      never be usable to raise a fee.
    function testFuzz_LowerFeeImmediatelyCannotRaise(uint16 start, uint16 attempt) public {
        start = uint16(bound(start, 1, router.maxBps(IFeeRouter.Product.Swap)));
        attempt = uint16(bound(attempt, uint256(start) + 1, type(uint16).max));
        _setConfig(IFeeRouter.Product.Swap, start, 0, 0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IFeeRouter.FeeExceedsHardCap.selector, attempt, start));
        router.lowerFeeImmediately(IFeeRouter.Product.Swap, attempt, 0);
    }

    function testFuzz_LowerFeeImmediatelyWorksDownward(uint16 start, uint16 target) public {
        start = uint16(bound(start, 1, router.maxBps(IFeeRouter.Product.Swap)));
        target = uint16(bound(target, 0, start));
        _setConfig(IFeeRouter.Product.Swap, start, 0, 0);

        vm.prank(owner);
        router.lowerFeeImmediately(IFeeRouter.Product.Swap, target, 0);
        assertEq(router.bpsOf(IFeeRouter.Product.Swap), target);
    }

    function test_TreasuryChangeIsTimelocked() public {
        address newTreasury = makeAddr("newTreasury");
        vm.startPrank(owner);
        router.proposeTreasury(newTreasury);
        vm.expectRevert();
        router.executeTreasury();
        vm.warp(block.timestamp + DELAY);
        router.executeTreasury();
        vm.stopPrank();
        assertEq(router.treasury(), newTreasury);
    }

    // -----------------------------------------------------------------
    // Fee intake and splitting
    // -----------------------------------------------------------------

    function testFuzz_NativeSplitIsExactAndConserved(uint128 amount, uint16 shareBps) public {
        amount = uint128(bound(amount, 1, 100 ether));
        shareBps = uint16(bound(shareBps, 0, 10_000));
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, shareBps, 0);

        vm.prank(payer);
        router.routeNative{value: amount}(IFeeRouter.Product.BondingCurveTrade, creator);

        uint256 creatorBal = router.balanceOf(creator, address(0));
        uint256 treasuryBal = router.balanceOf(treasury, address(0));

        assertEq(creatorBal, (uint256(amount) * shareBps) / 10_000, "creator share");
        // Conservation: nothing is created, nothing is lost to rounding.
        assertEq(creatorBal + treasuryBal, amount, "split conserves total");
        assertEq(address(router).balance, amount, "router holds exactly what it credited");
    }

    function test_NullCreatorSendsEverythingToTreasury() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 5_000, 0);
        vm.prank(payer);
        router.routeNative{value: 1 ether}(IFeeRouter.Product.BondingCurveTrade, address(0));
        assertEq(router.balanceOf(treasury, address(0)), 1 ether);
    }

    function test_RouteNativeRejectsZero() public {
        vm.prank(payer);
        vm.expectRevert(IFeeRouter.ZeroAmount.selector);
        router.routeNative{value: 0}(IFeeRouter.Product.Swap, creator);
    }

    function test_BareNativeTransferReverts() public {
        vm.prank(payer);
        (bool ok,) = address(router).call{value: 1 ether}("");
        assertFalse(ok, "router must not accept unaccounted native currency");
    }

    function testFuzz_ERC20SplitIsExactAndConserved(uint128 amount, uint16 shareBps) public {
        amount = uint128(bound(amount, 1, type(uint96).max));
        shareBps = uint16(bound(shareBps, 0, 10_000));
        _setConfig(IFeeRouter.Product.Swap, 25, shareBps, 0);

        MockERC20 token = new MockERC20("Test", "TST", 18);
        token.mint(payer, amount);
        vm.startPrank(payer);
        token.approve(address(router), amount);
        router.routeERC20(IFeeRouter.Product.Swap, address(token), creator, amount);
        vm.stopPrank();

        assertEq(
            router.balanceOf(creator, address(token)) + router.balanceOf(treasury, address(token)),
            amount
        );
        assertEq(token.balanceOf(address(router)), amount);
    }

    /// @dev Internal accounting must never exceed the router's real balance, or the last
    ///      withdrawer is left unable to withdraw.
    function test_FeeOnTransferTokenCreditsOnlyWhatArrived() public {
        _setConfig(IFeeRouter.Product.Swap, 25, 5_000, 0);
        FeeOnTransferERC20 fot = new FeeOnTransferERC20(500); // 5% burn on transfer
        fot.mint(payer, 1_000e18);

        vm.startPrank(payer);
        fot.approve(address(router), 1_000e18);
        router.routeERC20(IFeeRouter.Product.Swap, address(fot), creator, 1_000e18);
        vm.stopPrank();

        uint256 credited =
            router.balanceOf(creator, address(fot)) + router.balanceOf(treasury, address(fot));
        assertEq(credited, 950e18, "credited the amount actually received");
        assertEq(fot.balanceOf(address(router)), 950e18);
        assertLe(credited, fot.balanceOf(address(router)), "accounting never exceeds real balance");
    }

    function test_RouteERC20RejectsNativeSentinel() public {
        vm.prank(payer);
        vm.expectRevert(IFeeRouter.ZeroAddress.selector);
        router.routeERC20(IFeeRouter.Product.Swap, address(0), creator, 1);
    }

    // -----------------------------------------------------------------
    // Withdrawal
    // -----------------------------------------------------------------

    function test_WithdrawNativePullsAndZeroes() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 5_000, 0);
        vm.prank(payer);
        router.routeNative{value: 2 ether}(IFeeRouter.Product.BondingCurveTrade, creator);

        vm.prank(creator);
        uint256 got = router.withdraw(address(0), creator);

        assertEq(got, 1 ether);
        assertEq(creator.balance, 1 ether);
        assertEq(router.balanceOf(creator, address(0)), 0);
    }

    function test_WithdrawTwiceReverts() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 10_000, 0);
        vm.prank(payer);
        router.routeNative{value: 1 ether}(IFeeRouter.Product.BondingCurveTrade, creator);

        vm.startPrank(creator);
        router.withdraw(address(0), creator);
        vm.expectRevert(IFeeRouter.NothingToWithdraw.selector);
        router.withdraw(address(0), creator);
        vm.stopPrank();
    }

    function test_WithdrawToRejectingContractReverts() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 10_000, 0);
        vm.prank(payer);
        router.routeNative{value: 1 ether}(IFeeRouter.Product.BondingCurveTrade, creator);

        RejectsNative sink = new RejectsNative();
        vm.prank(creator);
        vm.expectRevert(IFeeRouter.NativeTransferFailed.selector);
        router.withdraw(address(0), address(sink));
        // Balance must survive a failed withdrawal.
        assertEq(router.balanceOf(creator, address(0)), 1 ether);
    }

    /// @dev A creator address that re-enters on receive must not be able to withdraw twice.
    function test_ReentrantWithdrawCannotDoubleSpend() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 10_000, 0);
        ReentrantWithdrawer attacker = new ReentrantWithdrawer(router);

        vm.prank(payer);
        router.routeNative{value: 3 ether}(IFeeRouter.Product.BondingCurveTrade, address(attacker));
        // Fund the router beyond the attacker's credit so a double-spend would actually be payable.
        vm.prank(payer);
        router.routeNative{value: 10 ether}(IFeeRouter.Product.BondingCurveTrade, creator);

        attacker.attack();

        assertGt(attacker.attempts(), 0, "callback must have fired for this to be a real test");
        assertFalse(attacker.reentrySucceeded(), "re-entrant withdraw must not succeed");
        assertEq(address(attacker).balance, 3 ether, "attacker got exactly its credit, once");
        assertEq(router.balanceOf(address(attacker), address(0)), 0);
        assertEq(router.balanceOf(creator, address(0)), 10 ether, "other balances untouched");
    }

    function test_WithdrawToZeroAddressReverts() public {
        _setConfig(IFeeRouter.Product.BondingCurveTrade, 100, 10_000, 0);
        vm.prank(payer);
        router.routeNative{value: 1 ether}(IFeeRouter.Product.BondingCurveTrade, creator);
        vm.prank(creator);
        vm.expectRevert(IFeeRouter.ZeroAddress.selector);
        router.withdraw(address(0), address(0));
    }

    function test_FeeOnCalculatesFromConfiguredBps() public {
        _setConfig(IFeeRouter.Product.Swap, 25, 0, 0);
        assertEq(router.feeOn(IFeeRouter.Product.Swap, 10_000e18), 25e18);
        assertEq(router.feeOn(IFeeRouter.Product.Swap, 0), 0);
    }
}
