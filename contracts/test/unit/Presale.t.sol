// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {IUniswapV2Pair} from "../../src/interfaces/IUniswapV2.sol";
import {Presale} from "../../src/launch/Presale.sol";
import {Fixture} from "../Fixture.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PresaleTest is Fixture {
    MockERC20 internal saleToken;

    uint256 internal constant RATE = 1000e18; // 1000 tokens per native
    uint256 internal constant LP_RATE = 800e18; // pool priced above the sale price
    uint256 internal constant SOFT_CAP = 10 ether;
    uint256 internal constant HARD_CAP = 20 ether;

    function setUp() public {
        _deployEcosystem();
        saleToken = new MockERC20("Sale", "SALE", 18);
    }

    function _params() internal view returns (Presale.Params memory) {
        return Presale.Params({
            token: address(saleToken),
            owner: creator,
            tokensPerNative: RATE,
            liquidityTokensPerNative: LP_RATE,
            softCap: SOFT_CAP,
            hardCap: HARD_CAP,
            minContribution: 0.1 ether,
            maxContribution: 5 ether,
            startsAt: uint64(block.timestamp + 1 hours),
            endsAt: uint64(block.timestamp + 8 hours),
            liquidityBps: 6000,
            lockLpInsteadOfBurn: false,
            lpLockDuration: 0,
            whitelistRoot: bytes32(0),
            isFairLaunch: false
        });
    }

    function _create(Presale.Params memory p) internal returns (Presale sale) {
        uint256 needed = presaleFactory.tokensNeeded(p);
        saleToken.mint(creator, needed);
        vm.startPrank(creator);
        saleToken.approve(address(presaleFactory), needed);
        address addr = presaleFactory.createPresale(p, keccak256(abi.encode(p.startsAt, p.endsAt)));
        vm.stopPrank();
        return Presale(payable(addr));
    }

    function _contribute(Presale sale, address who, uint256 amount) internal {
        vm.prank(who);
        sale.contribute{value: amount}(new bytes32[](0));
    }

    // -----------------------------------------------------------------
    // Funding guarantee
    // -----------------------------------------------------------------

    /// @dev A sale that cannot pay every buyer at the hard cap must not be creatable.
    function test_SaleIsFullyFundedBeforeItCanOpen() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);

        uint256 owedAtHardCap = (HARD_CAP * RATE) / 1e18;
        // Deliberately mirrors `Presale._tokensNeeded` step for step, including its intermediate
        // truncation. Reordering for precision here would stop this matching the contract.
        // forge-lint: disable-next-line(divide-before-multiply)
        uint256 forPool = ((HARD_CAP * 6000 / 10_000) * LP_RATE) / 1e18;
        assertEq(saleToken.balanceOf(address(sale)), owedAtHardCap + forPool);
    }

    function test_UnderfundedSaleCannotBeCreated() public {
        Presale.Params memory p = _params();
        uint256 needed = presaleFactory.tokensNeeded(p);
        saleToken.mint(creator, needed - 1);
        vm.startPrank(creator);
        saleToken.approve(address(presaleFactory), needed);
        vm.expectRevert();
        presaleFactory.createPresale(p, keccak256("under"));
        vm.stopPrank();
    }

    function test_OwnerIsForcedToTheCaller() public {
        Presale.Params memory p = _params();
        p.owner = address(0xBAD);
        Presale sale = _create(p);
        assertEq(sale.owner(), creator, "owner must be the caller, not the supplied address");
    }

    function test_PoolRateAboveSaleRateIsRejected() public {
        Presale.Params memory p = _params();
        p.liquidityTokensPerNative = RATE + 1;
        uint256 needed = 1_000_000e18;
        saleToken.mint(creator, needed);
        vm.startPrank(creator);
        saleToken.approve(address(presaleFactory), needed);
        vm.expectRevert(abi.encodeWithSelector(Presale.InvalidParams.selector, "pool rate above sale rate"));
        presaleFactory.createPresale(p, keccak256("badrate"));
        vm.stopPrank();
    }

    function test_LiquidityShareBelowFloorIsRejected() public {
        Presale.Params memory p = _params();
        p.liquidityBps = 4999;
        uint256 needed = 1_000_000e18;
        saleToken.mint(creator, needed);
        vm.startPrank(creator);
        saleToken.approve(address(presaleFactory), needed);
        vm.expectRevert(abi.encodeWithSelector(Presale.InvalidParams.selector, "liquidity share out of range"));
        presaleFactory.createPresale(p, keccak256("badliq"));
        vm.stopPrank();
    }

    // -----------------------------------------------------------------
    // Contribution rules
    // -----------------------------------------------------------------

    function test_ContributionBoundsAreEnforced() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);

        vm.prank(alice);
        vm.expectRevert();
        sale.contribute{value: 0.05 ether}(new bytes32[](0));

        vm.prank(alice);
        vm.expectRevert();
        sale.contribute{value: 5.1 ether}(new bytes32[](0));

        _contribute(sale, alice, 5 ether);
        assertEq(sale.contributionOf(alice), 5 ether);
    }

    function test_CannotContributeBeforeStartOrAfterEnd() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);

        vm.prank(alice);
        vm.expectRevert(Presale.NotLive.selector);
        sale.contribute{value: 1 ether}(new bytes32[](0));

        vm.warp(p.endsAt + 1);
        vm.prank(alice);
        vm.expectRevert(Presale.NotLive.selector);
        sale.contribute{value: 1 ether}(new bytes32[](0));
    }

    /// @dev Overshooting the hard cap reverts rather than being partially filled and refunded.
    ///      An explicit revert keeps `contribute` free of any outbound native transfer, so there
    ///      is no refund path inside the contribution flow to re-enter.
    function test_HardCapOvershootRevertsRatherThanPartiallyFilling() public {
        Presale.Params memory p = _params();
        p.maxContribution = HARD_CAP;
        Presale sale = _create(p);
        vm.warp(p.startsAt);

        _contribute(sale, alice, HARD_CAP - 0.5 ether);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Presale.HardCapExceeded.selector, 1 ether, 0.5 ether));
        sale.contribute{value: 1 ether}(new bytes32[](0));

        // Filling the cap exactly closes the sale to further contributions.
        _contribute(sale, bob, 0.5 ether);
        assertEq(uint8(sale.state()), uint8(Presale.State.AwaitingFinalisation));
        vm.prank(carol);
        vm.expectRevert(Presale.NotLive.selector);
        sale.contribute{value: 0.1 ether}(new bytes32[](0));
    }

    function test_DirectNativeTransferIsRejected() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        vm.prank(alice);
        (bool ok,) = address(sale).call{value: 1 ether}("");
        assertFalse(ok, "unattributable value would be unrefundable, so it must be rejected");
    }

    // -----------------------------------------------------------------
    // Failure path - the property that matters most
    // -----------------------------------------------------------------

    /// @dev Every contributor to a failed sale must be able to recover exactly what they paid,
    ///      and the contract must hold enough to pay all of them.
    function testFuzz_FailedSaleAlwaysRefundsEveryoneInFull(uint96 a, uint96 b, uint96 c) public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);

        uint256[3] memory amounts =
            [bound(a, 0.1 ether, 3 ether), bound(b, 0.1 ether, 3 ether), bound(c, 0.1 ether, 3 ether)];
        address[3] memory who = [alice, bob, carol];

        uint256 total;
        for (uint256 i; i < 3; ++i) {
            _contribute(sale, who[i], amounts[i]);
            total += amounts[i];
        }
        vm.assume(total < SOFT_CAP); // force failure

        vm.warp(p.endsAt + 1);
        assertEq(uint8(sale.state()), uint8(Presale.State.Failed));
        assertEq(address(sale).balance, total, "sale holds exactly what it owes");

        for (uint256 i; i < 3; ++i) {
            uint256 before = who[i].balance;
            vm.prank(who[i]);
            sale.refund();
            assertEq(who[i].balance - before, amounts[i], "refunded exactly what was contributed");
        }
        assertEq(address(sale).balance, 0, "nothing left stranded");
    }

    function test_FailedSaleCannotBeFinalised() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 1 ether);
        vm.warp(p.endsAt + 1);

        vm.expectRevert(Presale.SoftCapNotReached.selector);
        sale.finalise();
    }

    /// @dev The owner must have no way to reach contributors' money in a failed sale.
    function test_OwnerCannotTouchContributionsOnFailure() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 1 ether);
        vm.warp(p.endsAt + 1);

        uint256 ownerBefore = creator.balance;
        vm.prank(creator);
        sale.recoverTokens(); // tokens only
        assertEq(creator.balance, ownerBefore, "recoverTokens must not move native currency");
        assertEq(address(sale).balance, 1 ether, "contribution still intact for its contributor");
    }

    function test_DoubleRefundIsRejected() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 1 ether);
        vm.warp(p.endsAt + 1);

        vm.startPrank(alice);
        sale.refund();
        vm.expectRevert(Presale.NothingToRefund.selector);
        sale.refund();
        vm.stopPrank();
    }

    function test_CancelOpensRefundsImmediately() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 1 ether);

        vm.prank(creator);
        sale.cancel();
        assertEq(uint8(sale.state()), uint8(Presale.State.Failed));

        uint256 before = alice.balance;
        vm.prank(alice);
        sale.refund();
        assertEq(alice.balance - before, 1 ether);
    }

    /// @dev Regression: once a sale is finalisable, the owner must lose the ability to unwind it.
    function test_CannotCancelOnceFinalisable() public {
        Presale.Params memory p = _params();
        p.maxContribution = HARD_CAP;
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, SOFT_CAP);
        vm.warp(p.endsAt + 1);

        assertEq(uint8(sale.state()), uint8(Presale.State.AwaitingFinalisation));
        vm.prank(creator);
        vm.expectRevert(Presale.SoftCapReached.selector);
        sale.cancel();
    }

    // -----------------------------------------------------------------
    // Success path
    // -----------------------------------------------------------------

    function test_SuccessfulSaleSeedsPoolBurnsLpAndPaysOut() public {
        Presale.Params memory p = _params();
        p.maxContribution = HARD_CAP;
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 12 ether);
        vm.warp(p.endsAt + 1);

        uint256 ownerBefore = creator.balance;
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));

        sale.finalise();

        assertEq(uint8(sale.state()), uint8(Presale.State.Succeeded));
        assertEq(address(sale).balance, 0, "nothing left over");

        uint256 raised = 12 ether;
        uint256 expectedFee = (raised * 200) / 10_000; // 2% presale fee
        uint256 toLiquidity = (raised * 6000) / 10_000;

        assertEq(creator.balance - ownerBefore, raised - toLiquidity - expectedFee);
        assertEq(feeRouter.balanceOf(treasury, address(0)) - treasuryBefore, expectedFee);

        IUniswapV2Pair pair = IUniswapV2Pair(dexFactory.getPair(address(saleToken), address(weth)));
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertGt(r0, 0);
        assertGt(r1, 0);
        assertEq(pair.balanceOf(sale.BURN_ADDRESS()), pair.totalSupply(), "LP fully burned");
    }

    /// @dev The fee must come out of the owner's share, never the liquidity allocation, or
    ///      contributors get a thinner pool than they were shown.
    function test_PlatformFeeNeverReducesTheLiquidityAllocation() public {
        Presale.Params memory p = _params();
        p.maxContribution = HARD_CAP;
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 15 ether);
        vm.warp(p.endsAt + 1);
        sale.finalise();

        IUniswapV2Pair pair = IUniswapV2Pair(dexFactory.getPair(address(saleToken), address(weth)));
        uint256 wethInPool = IERC20(address(weth)).balanceOf(address(pair));
        assertEq(wethInPool, (15 ether * 6000) / 10_000, "pool got the full promised share");
    }

    function test_ContributorsClaimExactlyTheirAllocation() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 4 ether);
        _contribute(sale, bob, 5 ether);
        _contribute(sale, carol, 3 ether);
        vm.warp(p.endsAt + 1);
        sale.finalise();

        address[3] memory who = [alice, bob, carol];
        for (uint256 i; i < 3; ++i) {
            uint256 expected = sale.allocationOf(who[i]);
            vm.prank(who[i]);
            sale.claim();
            assertEq(saleToken.balanceOf(who[i]), expected);
        }
    }

    function test_DoubleClaimIsRejected() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 5 ether);
        _contribute(sale, bob, 5 ether);
        vm.warp(p.endsAt + 1);
        sale.finalise();

        vm.startPrank(alice);
        sale.claim();
        vm.expectRevert(Presale.NothingToClaim.selector);
        sale.claim();
        vm.stopPrank();
    }

    /// @dev After everyone claims, the sale must still be able to pay the last claimant.
    function test_SaleRemainsSolventForEveryClaimant() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 5 ether);
        _contribute(sale, bob, 5 ether);
        _contribute(sale, carol, 2 ether);
        vm.warp(p.endsAt + 1);
        sale.finalise();

        uint256 owed = sale.allocationOf(alice) + sale.allocationOf(bob) + sale.allocationOf(carol);
        assertGe(saleToken.balanceOf(address(sale)), owed, "sale holds every token it owes");

        address[3] memory who = [alice, bob, carol];
        for (uint256 i; i < 3; ++i) {
            vm.prank(who[i]);
            sale.claim();
        }
    }

    function test_FinaliseIsPermissionlessSoOwnerCannotStall() public {
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 5 ether);
        _contribute(sale, bob, 5 ether);
        vm.warp(p.endsAt + 1);

        vm.prank(carol); // an unrelated address
        sale.finalise();
        assertEq(uint8(sale.state()), uint8(Presale.State.Succeeded));
    }

    function test_LockLpInsteadOfBurn() public {
        Presale.Params memory p = _params();
        p.lockLpInsteadOfBurn = true;
        p.lpLockDuration = 180 days;
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 5 ether);
        _contribute(sale, bob, 5 ether);
        vm.warp(p.endsAt + 1);
        sale.finalise();

        uint256[] memory ids = locker.lockIdsOfOwner(creator);
        assertEq(ids.length, 1);
        assertFalse(locker.isUnlocked(ids[0]));
    }

    // -----------------------------------------------------------------
    // Whitelist
    // -----------------------------------------------------------------

    function test_WhitelistGatesContributions() public {
        bytes32 aliceLeaf = keccak256(bytes.concat(keccak256(abi.encode(alice))));
        bytes32 bobLeaf = keccak256(bytes.concat(keccak256(abi.encode(bob))));
        bytes32 root = aliceLeaf < bobLeaf
            ? keccak256(abi.encodePacked(aliceLeaf, bobLeaf))
            : keccak256(abi.encodePacked(bobLeaf, aliceLeaf));

        Presale.Params memory p = _params();
        p.whitelistRoot = root;
        Presale sale = _create(p);
        vm.warp(p.startsAt);

        bytes32[] memory aliceProof = new bytes32[](1);
        aliceProof[0] = bobLeaf;

        vm.prank(alice);
        sale.contribute{value: 1 ether}(aliceProof);
        assertEq(sale.contributionOf(alice), 1 ether);

        vm.prank(carol);
        vm.expectRevert(Presale.NotWhitelisted.selector);
        sale.contribute{value: 1 ether}(aliceProof);
    }

    // -----------------------------------------------------------------
    // Fee ceiling
    // -----------------------------------------------------------------

    function test_PresaleFeeCannotExceedThreePercent() public {
        _setFee(IFeeRouter.Product.Presale, 300, 0, 0);
        Presale.Params memory p = _params();
        Presale sale = _create(p);
        vm.warp(p.startsAt);
        _contribute(sale, alice, 5 ether);
        _contribute(sale, bob, 5 ether);
        vm.warp(p.endsAt + 1);

        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));
        sale.finalise();
        uint256 charged = feeRouter.balanceOf(treasury, address(0)) - treasuryBefore;
        assertEq(charged, (10 ether * 300) / 10_000);
        assertLe((charged * 10_000) / 10 ether, 300, "hard ceiling holds");
    }
}
