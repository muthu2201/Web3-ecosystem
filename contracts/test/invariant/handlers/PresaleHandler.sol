// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Presale} from "../../../src/launch/Presale.sol";
import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

/// @notice Drives a presale through randomised contribute / refund / time sequences.
/// @dev Maintains its own ledger of what each actor has paid in and taken out, entirely
///      independently of the presale's storage, so the solvency invariants are checked against
///      an external source of truth rather than against the contract agreeing with itself.
contract PresaleHandler is CommonBase, StdCheats, StdUtils {
    Presale public immutable sale;
    address[] public actors;

    /// @dev Minimum contributions before the handler will close the sale. See `endSale`.
    uint256 internal constant MIN_CONTRIBUTIONS_BEFORE_CLOSE = 8;

    mapping(address => uint256) public ghostContributed;
    mapping(address => uint256) public ghostRefunded;
    uint256 public ghostTotalContributed;
    uint256 public ghostTotalRefunded;
    uint256 public contributeCount;
    uint256 public refundCount;

    constructor(Presale sale_, address[] memory actors_) {
        sale = sale_;
        actors = actors_;
        // Open the sale immediately. Otherwise the first call is a coin flip between advancing
        // time and contributing, and every contribution before the window opens is wasted.
        vm.warp(sale_.startsAt());
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function contribute(uint256 actorSeed, uint256 amount) public {
        address actor = _actor(actorSeed);
        amount = bound(amount, 0.1 ether, 5 ether);
        vm.deal(actor, actor.balance + amount);

        vm.prank(actor);
        try sale.contribute{value: amount}(new bytes32[](0)) {
            ghostContributed[actor] += amount;
            ghostTotalContributed += amount;
            contributeCount++;
        } catch {
            // not live, over the hard cap, or outside the per-wallet bounds
        }
    }

    function refund(uint256 actorSeed) public {
        address actor = _actor(actorSeed);
        uint256 before = actor.balance;
        vm.prank(actor);
        try sale.refund() returns (uint256) {
            uint256 got = actor.balance - before;
            ghostRefunded[actor] += got;
            ghostTotalRefunded += got;
            refundCount++;
        } catch {
            // sale has not failed, or nothing to refund
        }
    }

    /// @dev Small steps, so the sale spends most of a run live and accepting contributions.
    function advanceTime(uint256 secondsToSkip) public {
        vm.warp(vm.getBlockTimestamp() + bound(secondsToSkip, 1 minutes, 2 hours));
    }

    /// @dev Jumps straight to the end of the sale window.
    ///
    ///      Relying on `advanceTime` to accumulate past `endsAt` does not work: Foundry's fuzzer
    ///      biases hard toward the boundaries of a `bound` range, so most steps come back as the
    ///      minimum and the sale never closes inside a run. That left the refund path - the whole
    ///      point of this suite - completely unexercised while every invariant still reported
    ///      green, because they each return early when the sale is not in the Failed state.
    ///
    ///      An explicit transition makes the failure path reachable in essentially every run.
    ///
    ///      It is gated on the sale having actually raised something first. Ungated, the fuzzer
    ///      would frequently close the sale on the opening call and no contribution would ever
    ///      land - trading one vacuous campaign for another. The gate models the only ordering
    ///      that is interesting: a sale that ran, took money, and then closed short.
    function endSale() public {
        if (contributeCount < MIN_CONTRIBUTIONS_BEFORE_CLOSE) return;
        uint64 endsAt = sale.endsAt();
        if (vm.getBlockTimestamp() < endsAt) vm.warp(endsAt);
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }
}
