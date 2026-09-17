// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LiquidityLocker
/// @notice Time-locks LP tokens so a project can prove its liquidity cannot be pulled.
///
/// @dev A liquidity lock is only worth anything if it is unconditional. This contract therefore
///      has NO owner, NO admin role, NO pause, NO emergency withdrawal and NO upgrade path.
///      There is no code that moves a locked balance before `unlockTime`, so there is nothing a
///      platform operator, a project team or a compromised key can do to release it early.
///
/// @dev Locking is deliberately free. Charging for it would tax the safest thing a launch can do.
///
/// @dev Fee-on-transfer LP tokens are handled by crediting the amount actually received, so a
///      lock's recorded amount is always withdrawable.
contract LiquidityLocker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address token;
        address owner;
        uint256 amount;
        uint64 unlockTime;
        uint64 createdAt;
    }

    uint256 private _nextLockId = 1;

    mapping(uint256 lockId => Lock) private _locks;
    mapping(address token => uint256[] lockIds) private _locksByToken;
    mapping(address owner => uint256[] lockIds) private _locksByOwner;

    /// @notice Total amount currently locked per token, across all locks.
    mapping(address token => uint256 amount) public totalLocked;

    event LockCreated(
        uint256 indexed lockId, address indexed token, address indexed owner, uint256 amount, uint64 unlockTime
    );
    event LockExtended(uint256 indexed lockId, uint64 oldUnlockTime, uint64 newUnlockTime);
    event LockToppedUp(uint256 indexed lockId, uint256 addedAmount, uint256 newAmount);
    event LockOwnershipTransferred(uint256 indexed lockId, address indexed from, address indexed to);
    event Withdrawn(uint256 indexed lockId, address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error UnlockTimeInPast(uint64 unlockTime);
    error LockDurationTooLong(uint64 unlockTime);
    error NotLockOwner(uint256 lockId, address caller);
    error StillLocked(uint256 lockId, uint64 unlockTime);
    error CannotShortenLock(uint64 current, uint64 requested);
    error InsufficientLockedAmount(uint256 available, uint256 requested);
    error UnknownLock(uint256 lockId);

    /// @dev Bounds a lock so a typo in a UNIX timestamp cannot accidentally create a lock lasting
    ///      until the year 2200. 100 years is far beyond any real vesting schedule.
    uint64 public constant MAX_LOCK_DURATION = 36_500 days;

    /// @notice Lock `amount` of `token` until `unlockTime`.
    /// @return lockId Identifier used for every later operation on this lock.
    function lock(address token, uint256 amount, uint64 unlockTime, address owner)
        external
        nonReentrant
        returns (uint256 lockId)
    {
        if (token == address(0) || owner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert UnlockTimeInPast(unlockTime);
        if (unlockTime > block.timestamp + MAX_LOCK_DURATION) revert LockDurationTooLong(unlockTime);

        uint256 received = _pull(token, amount);

        lockId = _nextLockId++;
        _locks[lockId] = Lock({
            token: token, owner: owner, amount: received, unlockTime: unlockTime, createdAt: uint64(block.timestamp)
        });
        _locksByToken[token].push(lockId);
        _locksByOwner[owner].push(lockId);
        totalLocked[token] += received;

        emit LockCreated(lockId, token, owner, received, unlockTime);
    }

    /// @notice Add more tokens to an existing lock. Never changes the unlock time.
    function topUp(uint256 lockId, uint256 amount) external nonReentrant {
        Lock storage l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        if (amount == 0) revert ZeroAmount();

        uint256 received = _pull(l.token, amount);
        l.amount += received;
        totalLocked[l.token] += received;
        emit LockToppedUp(lockId, received, l.amount);
    }

    /// @notice Push the unlock time further out. Can never bring it closer.
    function extend(uint256 lockId, uint64 newUnlockTime) external {
        Lock storage l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner(lockId, msg.sender);
        if (newUnlockTime <= l.unlockTime) revert CannotShortenLock(l.unlockTime, newUnlockTime);
        if (newUnlockTime > block.timestamp + MAX_LOCK_DURATION) revert LockDurationTooLong(newUnlockTime);

        uint64 old = l.unlockTime;
        l.unlockTime = newUnlockTime;
        emit LockExtended(lockId, old, newUnlockTime);
    }

    /// @notice Hand the right to withdraw after unlock to another address.
    function transferLockOwnership(uint256 lockId, address newOwner) external {
        Lock storage l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner(lockId, msg.sender);
        if (newOwner == address(0)) revert ZeroAddress();

        address old = l.owner;
        l.owner = newOwner;
        _locksByOwner[newOwner].push(lockId);
        emit LockOwnershipTransferred(lockId, old, newOwner);
    }

    /// @notice Withdraw up to the full locked amount, only once `unlockTime` has passed.
    /// @dev The only path out of this contract. There is no other.
    function withdraw(uint256 lockId, uint256 amount, address to) external nonReentrant {
        Lock storage l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner(lockId, msg.sender);
        if (to == address(0)) revert ZeroAddress();
        if (block.timestamp < l.unlockTime) revert StillLocked(lockId, l.unlockTime);
        if (amount == 0) revert ZeroAmount();
        if (amount > l.amount) revert InsufficientLockedAmount(l.amount, amount);

        address token = l.token;
        l.amount -= amount; // effects before interaction
        totalLocked[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(lockId, to, amount);
    }

    // ---------------------------------------------------------------------
    // Views - what a risk badge or a listing page reads
    // ---------------------------------------------------------------------

    function getLock(uint256 lockId) external view returns (Lock memory) {
        Lock memory l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        return l;
    }

    function isUnlocked(uint256 lockId) external view returns (bool) {
        Lock memory l = _locks[lockId];
        if (l.owner == address(0)) revert UnknownLock(lockId);
        return block.timestamp >= l.unlockTime;
    }

    function lockIdsOfToken(address token) external view returns (uint256[] memory) {
        return _locksByToken[token];
    }

    function lockIdsOfOwner(address owner) external view returns (uint256[] memory) {
        return _locksByOwner[owner];
    }

    function nextLockId() external view returns (uint256) {
        return _nextLockId;
    }

    /// @notice Latest unlock time across every lock on `token`, and the total amount locked.
    /// @dev What a "liquidity locked until" badge should show. Iterates this token's locks only.
    function lockSummary(address token) external view returns (uint256 amount, uint64 latestUnlock) {
        uint256[] storage ids = _locksByToken[token];
        amount = totalLocked[token];
        for (uint256 i; i < ids.length; ++i) {
            Lock storage l = _locks[ids[i]];
            if (l.amount != 0 && l.unlockTime > latestUnlock) latestUnlock = l.unlockTime;
        }
    }

    function _pull(address token, uint256 amount) private returns (uint256 received) {
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        received = IERC20(token).balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
    }
}
