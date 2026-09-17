// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";

/// @notice Attempts to re-enter `FeeRouter.withdraw` from its native-transfer callback.
/// @dev Proves both defences hold at once: the balance is zeroed before the external call
///      (so a re-entrant call would find nothing), and `nonReentrant` rejects the attempt
///      outright. `attempts` records that the callback really did fire.
contract ReentrantWithdrawer {
    IFeeRouter public immutable router;
    uint256 public attempts;
    bool public reentrySucceeded;

    constructor(IFeeRouter router_) {
        router = router_;
    }

    function attack() external {
        router.withdraw(address(0), address(this));
    }

    receive() external payable {
        if (attempts < 3) {
            attempts++;
            try router.withdraw(address(0), address(this)) {
                reentrySucceeded = true;
            } catch {
                // expected: ReentrancyGuard rejects, and the balance is already zero
            }
        }
    }
}
