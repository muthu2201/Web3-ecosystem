// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Presale} from "../../src/launch/Presale.sol";
import {Fixture} from "../Fixture.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {PresaleHandler} from "./handlers/PresaleHandler.sol";

/// @notice Stateful invariants for the presale, centred on one question: can every contributor
///         always get their money back when the sale fails?
///
/// @dev The parameters below are chosen so the campaign reliably reaches the FAILURE path, which
///      is the path worth fuzzing - it is the one where contributors' money must come back out
///      of a contract whose owner wants it. The soft cap sits above the maximum the five actors
///      can collectively contribute under the per-wallet limit, so the sale always closes short;
///      the window is short enough that it closes partway through a run, leaving the remaining
///      calls to exercise refunds against a live ledger.
///
///      The success path is covered deterministically in `PresaleTest` instead. Fuzzing it here
///      would mean the sale hit its hard cap early and spent the rest of every run finalised and
///      inert, which is how an invariant suite ends up passing without testing anything.
contract PresaleInvariantTest is Fixture {
    PresaleHandler internal handler;
    Presale internal sale;
    MockERC20 internal saleToken;

    function setUp() public {
        _deployEcosystem();
        saleToken = new MockERC20("Sale", "SALE", 18);

        Presale.Params memory p = Presale.Params({
            token: address(saleToken),
            owner: creator,
            tokensPerNative: 1_000e18,
            liquidityTokensPerNative: 800e18,
            softCap: 55 ether, // above the 50 ether five actors can reach at 10 ether each
            hardCap: 60 ether,
            minContribution: 0.1 ether,
            maxContribution: 10 ether,
            startsAt: uint64(vm.getBlockTimestamp() + 1 hours),
            endsAt: uint64(vm.getBlockTimestamp() + 1 hours + 24 hours),
            liquidityBps: 6_000,
            lockLpInsteadOfBurn: false,
            lpLockDuration: 0,
            whitelistRoot: bytes32(0),
            isFairLaunch: false
        });

        uint256 needed = presaleFactory.tokensNeeded(p);
        saleToken.mint(creator, needed);
        vm.startPrank(creator);
        saleToken.approve(address(presaleFactory), needed);
        sale = Presale(payable(presaleFactory.createPresale(p, keccak256("invariant"))));
        vm.stopPrank();

        address[] memory actors = new address[](5);
        actors[0] = alice;
        actors[1] = bob;
        actors[2] = carol;
        actors[3] = makeAddr("dave");
        actors[4] = makeAddr("erin");

        handler = new PresaleHandler(sale, actors);
        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = PresaleHandler.contribute.selector;
        selectors[1] = PresaleHandler.refund.selector;
        selectors[2] = PresaleHandler.advanceTime.selector;
        selectors[3] = PresaleHandler.endSale.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @dev SOLVENCY, checked against an external ledger. While the sale is unfinalised it must
    ///      hold exactly what has been paid in and not yet refunded - no more, no less.
    function invariant_BalanceEqualsOutstandingContributions() public view {
        if (sale.finalised()) return;
        assertEq(
            address(sale).balance,
            handler.ghostTotalContributed() - handler.ghostTotalRefunded(),
            "sale must hold exactly the contributions it still owes"
        );
    }

    /// @dev The contract's own accounting must agree with the external ledger.
    function invariant_RecordedTotalMatchesLedger() public view {
        if (sale.finalised()) return;
        assertEq(
            sale.totalRaised() - handler.ghostTotalRefunded(),
            handler.ghostTotalContributed() - handler.ghostTotalRefunded(),
            "recorded raise must match what was actually paid in"
        );
    }

    /// @dev Nobody can ever take out more than they put in.
    function invariant_NoActorEverProfits() public view {
        uint256 n = handler.actorCount();
        for (uint256 i; i < n; ++i) {
            address actor = handler.actors(i);
            assertLe(
                handler.ghostRefunded(actor),
                handler.ghostContributed(actor),
                "refund exceeded contribution"
            );
        }
    }

    /// @dev THE property this contract exists for: if the sale has failed, every contributor who
    ///      has not yet refunded must still be fully covered by the balance on hand.
    function invariant_FailedSaleCanAlwaysCoverEveryRefund() public view {
        if (sale.state() != Presale.State.Failed) return;

        uint256 owed;
        uint256 n = handler.actorCount();
        for (uint256 i; i < n; ++i) {
            owed += sale.contributionOf(handler.actors(i));
        }
        assertLe(owed, address(sale).balance, "sale cannot cover the refunds it owes");
    }

    /// @dev The hard cap is absolute.
    function invariant_HardCapIsNeverBreached() public view {
        assertLe(sale.totalRaised(), sale.hardCap(), "raised past the hard cap");
    }

    /// @dev Tokens owed to buyers must always be backed by tokens actually held.
    function invariant_SaleHoldsEveryTokenItOwes() public view {
        if (!sale.finalised()) {
            uint256 owed = (sale.totalRaised() * sale.tokensPerNative()) / 1e18;
            assertLe(owed, saleToken.balanceOf(address(sale)), "sale owes more tokens than it holds");
        }
    }

    function afterInvariant() public view {
        assertGt(handler.contributeCount(), 0, "no contributions - invariants would be vacuous");
        assertGt(handler.refundCount(), 0, "no refunds - the refund path was never exercised");
    }
}
