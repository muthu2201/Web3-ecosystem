// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MerkleDistributor} from "../../src/distribution/MerkleDistributor.sol";
import {TokenVesting} from "../../src/distribution/TokenVesting.sol";
import {LiquidityLocker} from "../../src/liquidity/LiquidityLocker.sol";
import {Fixture} from "../Fixture.sol";
import {FeeOnTransferERC20, MockERC20} from "../mocks/MockERC20.sol";

contract DistributionTest is Fixture {
    MockERC20 internal token;

    function setUp() public {
        _deployEcosystem();
        token = new MockERC20("Test", "TST", 18);
        token.mint(creator, 10_000_000e18);
    }

    // =================================================================
    // LiquidityLocker
    // =================================================================

    function _lock(uint256 amount, uint64 until) internal returns (uint256 lockId) {
        vm.startPrank(creator);
        token.approve(address(locker), amount);
        lockId = locker.lock(address(token), amount, until, creator);
        vm.stopPrank();
    }

    /// @dev The defining property: nothing releases a lock before its time. No owner, no admin,
    ///      no emergency path - those functions do not exist on this contract.
    function testFuzz_LockedTokensAreUnreachableBeforeUnlock(uint64 warpTo) public {
        uint64 until = uint64(block.timestamp + 365 days);
        uint256 lockId = _lock(1000e18, until);

        warpTo = uint64(bound(warpTo, block.timestamp, until - 1));
        vm.warp(warpTo);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LiquidityLocker.StillLocked.selector, lockId, until));
        locker.withdraw(lockId, 1, creator);
        assertEq(token.balanceOf(address(locker)), 1000e18);
    }

    function test_WithdrawAfterUnlock() public {
        uint64 until = uint64(block.timestamp + 30 days);
        uint256 lockId = _lock(1000e18, until);
        vm.warp(until);

        uint256 before = token.balanceOf(creator);
        vm.prank(creator);
        locker.withdraw(lockId, 400e18, creator);
        assertEq(token.balanceOf(creator) - before, 400e18);
        assertEq(locker.getLock(lockId).amount, 600e18);
        assertEq(locker.totalLocked(address(token)), 600e18);
    }

    function test_OnlyLockOwnerCanWithdraw() public {
        uint64 until = uint64(block.timestamp + 1 days);
        uint256 lockId = _lock(1000e18, until);
        vm.warp(until);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LiquidityLocker.NotLockOwner.selector, lockId, alice));
        locker.withdraw(lockId, 1, alice);
    }

    function testFuzz_ExtendCanOnlyPushUnlockLater(uint64 newTime) public {
        uint64 until = uint64(block.timestamp + 30 days);
        uint256 lockId = _lock(1000e18, until);

        newTime = uint64(bound(newTime, 0, until));
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(LiquidityLocker.CannotShortenLock.selector, until, newTime));
        locker.extend(lockId, newTime);
    }

    function test_ExtendWorksForwards() public {
        uint64 until = uint64(block.timestamp + 30 days);
        uint256 lockId = _lock(1000e18, until);
        vm.prank(creator);
        locker.extend(lockId, until + 30 days);
        assertEq(locker.getLock(lockId).unlockTime, until + 30 days);
    }

    function test_TopUpDoesNotChangeUnlockTime() public {
        uint64 until = uint64(block.timestamp + 30 days);
        uint256 lockId = _lock(1000e18, until);

        vm.startPrank(creator);
        token.approve(address(locker), 500e18);
        locker.topUp(lockId, 500e18);
        vm.stopPrank();

        assertEq(locker.getLock(lockId).amount, 1500e18);
        assertEq(locker.getLock(lockId).unlockTime, until, "top-up must not move the unlock time");
    }

    function test_LockOwnershipTransfer() public {
        uint64 until = uint64(block.timestamp + 1 days);
        uint256 lockId = _lock(1000e18, until);
        vm.prank(creator);
        locker.transferLockOwnership(lockId, alice);

        vm.warp(until);
        vm.prank(alice);
        locker.withdraw(lockId, 1000e18, alice);
        assertEq(token.balanceOf(alice), 1000e18);
    }

    function test_LockRejectsPastUnlockTime() public {
        vm.startPrank(creator);
        token.approve(address(locker), 1e18);
        vm.expectRevert(abi.encodeWithSelector(LiquidityLocker.UnlockTimeInPast.selector, uint64(block.timestamp)));
        locker.lock(address(token), 1e18, uint64(block.timestamp), creator);
        vm.stopPrank();
    }

    function test_LockRejectsAbsurdDuration() public {
        vm.startPrank(creator);
        token.approve(address(locker), 1e18);
        uint64 tooFar = uint64(block.timestamp + 36_501 days);
        vm.expectRevert(abi.encodeWithSelector(LiquidityLocker.LockDurationTooLong.selector, tooFar));
        locker.lock(address(token), 1e18, tooFar, creator);
        vm.stopPrank();
    }

    function test_LockCreditsAmountActuallyReceived() public {
        FeeOnTransferERC20 fot = new FeeOnTransferERC20(500); // 5% burn
        fot.mint(creator, 1000e18);
        vm.startPrank(creator);
        fot.approve(address(locker), 1000e18);
        uint256 lockId = locker.lock(address(fot), 1000e18, uint64(block.timestamp + 1 days), creator);
        vm.stopPrank();

        assertEq(locker.getLock(lockId).amount, 950e18, "records what arrived, not what was asked");
        assertLe(locker.getLock(lockId).amount, fot.balanceOf(address(locker)));
    }

    function test_LockSummaryReportsLatestUnlock() public {
        _lock(100e18, uint64(block.timestamp + 10 days));
        _lock(200e18, uint64(block.timestamp + 90 days));
        (uint256 amount, uint64 latest) = locker.lockSummary(address(token));
        assertEq(amount, 300e18);
        assertEq(latest, uint64(block.timestamp + 90 days));
    }

    // =================================================================
    // TokenVesting
    // =================================================================

    function _schedule(uint256 amount, uint64 cliff, uint64 duration, bool revocable) internal returns (uint256 id) {
        vm.startPrank(creator);
        token.approve(address(vesting), amount);
        id = vesting.createSchedule(
            address(token), alice, amount, uint64(block.timestamp), cliff, duration, revocable
        );
        vm.stopPrank();
    }

    function test_NothingVestsBeforeTheCliff() public {
        uint256 id = _schedule(1000e18, 90 days, 360 days, false);
        vm.warp(block.timestamp + 89 days);
        assertEq(vesting.releasable(id), 0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TokenVesting.NothingToRelease.selector, id));
        vesting.release(id);
    }

    /// @dev At the cliff the whole accrued-so-far portion unlocks at once, then vesting continues
    ///      linearly from the original start.
    function test_CliffUnlocksAccruedPortionThenVestsLinearly() public {
        uint256 start = vm.getBlockTimestamp();
        uint256 id = _schedule(1000e18, 90 days, 360 days, false);

        vm.warp(start + 90 days);
        assertEq(vesting.vestedAmount(id), 250e18, "90/360 accrued at the cliff");

        vm.warp(start + 180 days);
        assertEq(vesting.vestedAmount(id), 500e18);

        vm.warp(start + 360 days);
        assertEq(vesting.vestedAmount(id), 1000e18);
    }

    function testFuzz_VestedNeverExceedsTotalAndNeverDecreases(uint64 t1, uint64 t2) public {
        uint256 start = vm.getBlockTimestamp();
        uint256 id = _schedule(1000e18, 30 days, 360 days, false);

        t1 = uint64(bound(t1, start, start + 720 days));
        t2 = uint64(bound(t2, t1, start + 720 days));

        vm.warp(t1);
        uint256 v1 = vesting.vestedAmount(id);
        vm.warp(t2);
        uint256 v2 = vesting.vestedAmount(id);

        assertLe(v2, 1000e18, "never over-vests");
        assertGe(v2, v1, "vesting never goes backwards");
    }

    function test_ReleaseTransfersExactlyWhatVested() public {
        uint256 start = vm.getBlockTimestamp();
        uint256 id = _schedule(1000e18, 0, 100 days, false);

        vm.warp(start + 50 days);
        vm.prank(alice);
        vesting.release(id);
        assertEq(token.balanceOf(alice), 500e18);

        vm.warp(start + 100 days);
        vm.prank(alice);
        vesting.release(id);
        assertEq(token.balanceOf(alice), 1000e18);
    }

    /// @dev Revocation must never reach tokens that have already vested.
    function testFuzz_RevokeNeverClawsBackVestedTokens(uint64 at) public {
        uint256 start = vm.getBlockTimestamp();
        uint256 id = _schedule(1000e18, 0, 100 days, true);

        at = uint64(bound(at, start, start + 100 days));
        vm.warp(at);
        uint256 vestedBefore = vesting.vestedAmount(id);

        vm.prank(creator);
        uint256 returned = vesting.revoke(id);

        assertEq(returned, 1000e18 - vestedBefore, "only the unvested remainder returns");
        assertEq(vesting.vestedAmount(id), vestedBefore, "vested amount is untouched");

        if (vestedBefore > 0) {
            vm.prank(alice);
            vesting.release(id);
            assertEq(token.balanceOf(alice), vestedBefore, "beneficiary still gets everything vested");
        }
    }

    function test_NonRevocableScheduleCannotBeRevoked() public {
        uint256 id = _schedule(1000e18, 0, 100 days, false);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TokenVesting.NotRevocable.selector, id));
        vesting.revoke(id);
    }

    function test_OnlyGrantorCanRevoke() public {
        uint256 id = _schedule(1000e18, 0, 100 days, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TokenVesting.NotGrantor.selector, id, alice));
        vesting.revoke(id);
    }

    function test_CliffLongerThanDurationIsRejected() public {
        vm.startPrank(creator);
        token.approve(address(vesting), 1e18);
        vm.expectRevert(
            abi.encodeWithSelector(TokenVesting.CliffExceedsDuration.selector, uint64(200 days), uint64(100 days))
        );
        vesting.createSchedule(address(token), alice, 1e18, uint64(block.timestamp), 200 days, 100 days, false);
        vm.stopPrank();
    }

    function test_BeneficiaryTransfer() public {
        uint256 start = vm.getBlockTimestamp();
        uint256 id = _schedule(1000e18, 0, 100 days, false);
        vm.prank(alice);
        vesting.transferBeneficiary(id, bob);

        vm.warp(start + 100 days);
        vm.prank(bob);
        vesting.release(id);
        assertEq(token.balanceOf(bob), 1000e18);
    }

    /// @dev Contract solvency: committed obligations must never exceed the real balance.
    function test_CommittedNeverExceedsBalance() public {
        _schedule(1000e18, 0, 100 days, false);
        _schedule(2000e18, 30 days, 200 days, true);
        assertLe(vesting.totalCommitted(address(token)), token.balanceOf(address(vesting)));
    }

    // =================================================================
    // MerkleDistributor
    // =================================================================

    function _buildTree(address a, uint256 amtA, address b, uint256 amtB)
        internal
        view
        returns (bytes32 root, bytes32 leafA, bytes32 leafB)
    {
        leafA = distributor.leafFor(0, a, amtA);
        leafB = distributor.leafFor(1, b, amtB);
        root = leafA < leafB ? keccak256(abi.encodePacked(leafA, leafB)) : keccak256(abi.encodePacked(leafB, leafA));
    }

    function test_ClaimPaysTheListedAccountAndOnlyOnce() public {
        (bytes32 root, bytes32 leafA, bytes32 leafB) = _buildTree(alice, 100e18, bob, 200e18);

        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = leafB;

        // Anyone may submit the proof; the tokens always go to the listed account.
        vm.prank(carol);
        distributor.claim(id, 0, alice, 100e18, proofA);
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.balanceOf(carol), 0, "relayer receives nothing");
        assertTrue(distributor.isClaimed(id, 0));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MerkleDistributor.AlreadyClaimed.selector, id, 0));
        distributor.claim(id, 0, alice, 100e18, proofA);

        bytes32[] memory proofB = new bytes32[](1);
        proofB[0] = leafA;
        vm.prank(bob);
        distributor.claim(id, 1, bob, 200e18, proofB);
        assertEq(token.balanceOf(bob), 200e18);
    }

    function test_InflatedAmountIsRejected() public {
        (bytes32 root,, bytes32 leafB) = _buildTree(alice, 100e18, bob, 200e18);
        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = leafB;

        vm.prank(alice);
        vm.expectRevert(MerkleDistributor.InvalidProof.selector);
        distributor.claim(id, 0, alice, 999e18, proofA);
    }

    function test_WrongAccountIsRejected() public {
        (bytes32 root,, bytes32 leafB) = _buildTree(alice, 100e18, bob, 200e18);
        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = leafB;

        vm.prank(carol);
        vm.expectRevert(MerkleDistributor.InvalidProof.selector);
        distributor.claim(id, 0, carol, 100e18, proofA);
    }

    function test_ShortClaimWindowIsRejected() public {
        vm.startPrank(creator);
        token.approve(address(distributor), 100e18);
        vm.expectRevert();
        distributor.createDistribution(
            address(token), bytes32(uint256(1)), 100e18, 0, uint64(block.timestamp + 1 days)
        );
        vm.stopPrank();
    }

    function test_SweepOnlyAfterExpiryAndOnlyByFunder() public {
        (bytes32 root,, bytes32 leafB) = _buildTree(alice, 100e18, bob, 200e18);
        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = leafB;
        vm.prank(alice);
        distributor.claim(id, 0, alice, 100e18, proofA);

        vm.prank(creator);
        vm.expectRevert();
        distributor.sweep(id, creator);

        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MerkleDistributor.NotFunder.selector, alice));
        distributor.sweep(id, alice);

        uint256 before = token.balanceOf(creator);
        vm.prank(creator);
        distributor.sweep(id, creator);
        assertEq(token.balanceOf(creator) - before, 200e18, "only the unclaimed remainder");
    }

    function test_ClaimAfterExpiryIsRejected() public {
        (bytes32 root,, bytes32 leafB) = _buildTree(alice, 100e18, bob, 200e18);
        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days);
        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = leafB;
        vm.prank(alice);
        vm.expectRevert();
        distributor.claim(id, 0, alice, 100e18, proofA);
    }

    /// @dev Bitmap indexing must be correct across word boundaries.
    function testFuzz_ClaimedBitmapIsIndependentPerIndex(uint16 i, uint16 j) public {
        vm.assume(i != j);
        (bytes32 root,,) = _buildTree(alice, 100e18, bob, 200e18);
        vm.startPrank(creator);
        token.approve(address(distributor), 300e18);
        uint256 id =
            distributor.createDistribution(address(token), root, 300e18, 0, uint64(block.timestamp + 30 days));
        vm.stopPrank();

        assertFalse(distributor.isClaimed(id, i));
        assertFalse(distributor.isClaimed(id, j));
    }
}
