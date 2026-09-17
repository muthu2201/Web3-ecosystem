// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenVesting
/// @notice Linear vesting with an optional cliff, for team and investor allocations.
///
/// @dev Each schedule is funded up front: the tokens are pulled into this contract when the
///      schedule is created, so a schedule can never be created against tokens the grantor does
///      not have. `totalCommitted` per token is tracked separately from the contract's balance,
///      which makes over-commitment structurally impossible.
///
/// @dev REVOCABILITY IS FIXED AT CREATION. A schedule is either revocable or it is not, decided
///      when it is funded and never changeable afterwards. Revoking returns only the *unvested*
///      remainder to the grantor - already-vested tokens always belong to the beneficiary, even
///      mid-revocation. A vesting contract where the grantor can claw back vested tokens is just
///      a delayed rug, so that path does not exist.
contract TokenVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Schedule {
        address token;
        address beneficiary;
        address grantor;
        uint128 totalAmount;
        uint128 released;
        uint64 start;
        uint64 cliffDuration;
        uint64 duration;
        bool revocable;
        bool revoked;
    }

    uint256 private _nextScheduleId = 1;

    mapping(uint256 scheduleId => Schedule) private _schedules;
    mapping(address beneficiary => uint256[] scheduleIds) private _byBeneficiary;
    mapping(address grantor => uint256[] scheduleIds) private _byGrantor;

    /// @notice Tokens this contract owes across all live schedules, per token.
    mapping(address token => uint256 amount) public totalCommitted;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed token,
        address indexed beneficiary,
        address grantor,
        uint256 amount,
        uint64 start,
        uint64 cliffDuration,
        uint64 duration,
        bool revocable
    );
    event Released(uint256 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event Revoked(uint256 indexed scheduleId, address indexed grantor, uint256 returnedAmount);
    event BeneficiaryTransferred(uint256 indexed scheduleId, address indexed from, address indexed to);

    error ZeroAddress();
    error ZeroAmount();
    error ZeroDuration();
    error CliffExceedsDuration(uint64 cliffDuration, uint64 duration);
    error UnknownSchedule(uint256 scheduleId);
    error NotBeneficiary(uint256 scheduleId, address caller);
    error NotGrantor(uint256 scheduleId, address caller);
    error NothingToRelease(uint256 scheduleId);
    error NotRevocable(uint256 scheduleId);
    error AlreadyRevoked(uint256 scheduleId);
    error AmountTooLarge(uint256 amount);

    /// @notice Create and fund a vesting schedule.
    /// @param start When vesting begins. May be in the past for a backdated grant.
    /// @param cliffDuration Seconds after `start` before anything is releasable.
    /// @param duration Total vesting period in seconds, measured from `start`.
    function createSchedule(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliffDuration,
        uint64 duration,
        bool revocable
    ) external nonReentrant returns (uint256 scheduleId) {
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint128).max) revert AmountTooLarge(amount);
        if (duration == 0) revert ZeroDuration();
        if (cliffDuration > duration) revert CliffExceedsDuration(cliffDuration, duration);

        // Fund first, then record. Credit what actually arrived so a fee-on-transfer token cannot
        // create a schedule larger than the tokens backing it.
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
        if (received > type(uint128).max) revert AmountTooLarge(received);

        scheduleId = _nextScheduleId++;
        _schedules[scheduleId] = Schedule({
            token: token,
            beneficiary: beneficiary,
            grantor: msg.sender,
            // Safe: `received > type(uint128).max` reverts with AmountTooLarge above.
            // forge-lint: disable-next-line(unsafe-typecast)
            totalAmount: uint128(received),
            released: 0,
            start: start,
            cliffDuration: cliffDuration,
            duration: duration,
            revocable: revocable,
            revoked: false
        });
        _byBeneficiary[beneficiary].push(scheduleId);
        _byGrantor[msg.sender].push(scheduleId);
        totalCommitted[token] += received;

        emit ScheduleCreated(
            scheduleId, token, beneficiary, msg.sender, received, start, cliffDuration, duration, revocable
        );
    }

    /// @notice Release everything vested and unreleased on `scheduleId` to the beneficiary.
    function release(uint256 scheduleId) external nonReentrant returns (uint256 amount) {
        Schedule storage s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);

        amount = _releasable(s);
        if (amount == 0) revert NothingToRelease(scheduleId);

        // Safe: `amount` is `vested - released` and `vested <= totalAmount`, a uint128.
        // forge-lint: disable-next-line(unsafe-typecast)
        s.released += uint128(amount); // effects before interaction
        totalCommitted[s.token] -= amount;
        IERC20(s.token).safeTransfer(s.beneficiary, amount);
        emit Released(scheduleId, s.beneficiary, amount);
    }

    /// @notice Revoke a revocable schedule, returning only the unvested remainder to the grantor.
    /// @dev Vested-but-unreleased tokens stay committed to the beneficiary and remain claimable
    ///      through `release` after revocation.
    function revoke(uint256 scheduleId) external nonReentrant returns (uint256 returned) {
        Schedule storage s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);
        if (msg.sender != s.grantor) revert NotGrantor(scheduleId, msg.sender);
        if (!s.revocable) revert NotRevocable(scheduleId);
        if (s.revoked) revert AlreadyRevoked(scheduleId);

        uint256 vested = _vestedAmount(s);
        returned = s.totalAmount - vested;

        s.revoked = true;
        // Shrink the grant to exactly what has already vested. The beneficiary keeps all of it.
        // Safe: `_vestedAmount` never exceeds `totalAmount`, which is already a uint128.
        // forge-lint: disable-next-line(unsafe-typecast)
        s.totalAmount = uint128(vested);

        if (returned != 0) {
            totalCommitted[s.token] -= returned;
            IERC20(s.token).safeTransfer(s.grantor, returned);
        }
        emit Revoked(scheduleId, s.grantor, returned);
    }

    /// @notice Hand a grant to a different address.
    function transferBeneficiary(uint256 scheduleId, address newBeneficiary) external {
        Schedule storage s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);
        if (msg.sender != s.beneficiary) revert NotBeneficiary(scheduleId, msg.sender);
        if (newBeneficiary == address(0)) revert ZeroAddress();

        address old = s.beneficiary;
        s.beneficiary = newBeneficiary;
        _byBeneficiary[newBeneficiary].push(scheduleId);
        emit BeneficiaryTransferred(scheduleId, old, newBeneficiary);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getSchedule(uint256 scheduleId) external view returns (Schedule memory) {
        Schedule memory s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);
        return s;
    }

    /// @notice Amount vested so far, whether or not it has been released.
    function vestedAmount(uint256 scheduleId) external view returns (uint256) {
        Schedule storage s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);
        return _vestedAmount(s);
    }

    /// @notice Amount claimable right now.
    function releasable(uint256 scheduleId) external view returns (uint256) {
        Schedule storage s = _schedules[scheduleId];
        if (s.beneficiary == address(0)) revert UnknownSchedule(scheduleId);
        return _releasable(s);
    }

    function schedulesOfBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _byBeneficiary[beneficiary];
    }

    function schedulesOfGrantor(address grantor) external view returns (uint256[] memory) {
        return _byGrantor[grantor];
    }

    function nextScheduleId() external view returns (uint256) {
        return _nextScheduleId;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _vestedAmount(Schedule storage s) private view returns (uint256) {
        // Once revoked, the grant is frozen at exactly what had already vested: `revoke` shrank
        // `totalAmount` to that figure, and it is fully vested by definition. Without this branch
        // the linear formula would be re-applied to the shrunken total, retroactively un-vesting
        // tokens the beneficiary already owned - the exact clawback this contract promises not to
        // allow. Caught by testFuzz_RevokeNeverClawsBackVestedTokens.
        if (s.revoked) return s.totalAmount;

        uint64 cliffEnd = s.start + s.cliffDuration;
        if (block.timestamp < cliffEnd) return 0;

        uint64 end = s.start + s.duration;
        if (block.timestamp >= end) return s.totalAmount;

        // Linear from `start`, not from the cliff: at the cliff the whole accrued-so-far portion
        // unlocks at once, which is how a cliff is normally understood.
        uint256 elapsed = block.timestamp - s.start;
        return (uint256(s.totalAmount) * elapsed) / s.duration;
    }

    function _releasable(Schedule storage s) private view returns (uint256) {
        return _vestedAmount(s) - s.released;
    }
}
