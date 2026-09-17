// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title MerkleDistributor
/// @notice Pull-based airdrop and holder-reward distribution.
///
/// @dev This is the recommended alternative to RFI-style reflection tokens. Rebasing reflections
///      break exchange accounting, cost gas on every single transfer, and are widely disliked by
///      integrators. A Merkle distribution costs the project one root update, costs holders who
///      never claim nothing at all, and leaves ERC-20 transfer semantics untouched.
///
/// @dev Leaves are double-hashed - `keccak256(bytes.concat(keccak256(abi.encode(...))))` - which
///      is the standard defence against second-preimage attacks, where a 64-byte internal node
///      could otherwise be passed off as a leaf to forge a claim.
///
/// @dev Each distribution is funded up front and its unclaimed remainder is only recoverable
///      after an expiry chosen at creation, so a funder cannot pull the rug on claimants mid-claim.
contract MerkleDistributor is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Distribution {
        address token;
        address funder;
        bytes32 merkleRoot;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint64 startsAt;
        uint64 expiresAt;
        bool swept;
    }

    /// @dev Minimum claim window. Stops a distribution being created and swept out from under
    ///      claimants before they realistically could have claimed.
    uint64 public constant MIN_CLAIM_WINDOW = 7 days;

    uint256 private _nextDistributionId = 1;

    mapping(uint256 distributionId => Distribution) private _distributions;
    /// @dev distributionId => word index => bitmap of claimed indices.
    mapping(uint256 => mapping(uint256 => uint256)) private _claimedBitmap;

    event DistributionCreated(
        uint256 indexed distributionId,
        address indexed token,
        address indexed funder,
        bytes32 merkleRoot,
        uint256 totalAmount,
        uint64 startsAt,
        uint64 expiresAt
    );
    event Claimed(uint256 indexed distributionId, uint256 indexed index, address indexed account, uint256 amount);
    event Swept(uint256 indexed distributionId, address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error ClaimWindowTooShort(uint64 window, uint64 minimum);
    error UnknownDistribution(uint256 distributionId);
    error NotStarted(uint64 startsAt);
    error Expired(uint64 expiresAt);
    error NotExpired(uint64 expiresAt);
    error AlreadyClaimed(uint256 distributionId, uint256 index);
    error InvalidProof();
    error NotFunder(address caller);
    error AlreadySwept();
    error ExceedsDistribution(uint256 requested, uint256 remaining);

    /// @notice Create and fund a distribution.
    /// @param merkleRoot Root over leaves of `keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))))`.
    function createDistribution(
        address token,
        bytes32 merkleRoot,
        uint256 totalAmount,
        uint64 startsAt,
        uint64 expiresAt
    ) external nonReentrant returns (uint256 distributionId) {
        if (token == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAmount();
        uint64 effectiveStart = startsAt == 0 ? uint64(block.timestamp) : startsAt;
        if (expiresAt < effectiveStart + MIN_CLAIM_WINDOW) {
            revert ClaimWindowTooShort(expiresAt > effectiveStart ? expiresAt - effectiveStart : 0, MIN_CLAIM_WINDOW);
        }

        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();

        distributionId = _nextDistributionId++;
        _distributions[distributionId] = Distribution({
            token: token,
            funder: msg.sender,
            merkleRoot: merkleRoot,
            totalAmount: received,
            claimedAmount: 0,
            startsAt: effectiveStart,
            expiresAt: expiresAt,
            swept: false
        });

        emit DistributionCreated(distributionId, token, msg.sender, merkleRoot, received, effectiveStart, expiresAt);
    }

    /// @notice Claim an allocation. Anyone may submit a valid proof; funds always go to `account`.
    /// @dev Paying out to `account` rather than `msg.sender` makes claims safely relayable - a
    ///      sponsor can pay gas for a user without being able to redirect the tokens.
    function claim(
        uint256 distributionId,
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        Distribution storage d = _distributions[distributionId];
        if (d.token == address(0)) revert UnknownDistribution(distributionId);
        if (block.timestamp < d.startsAt) revert NotStarted(d.startsAt);
        if (block.timestamp >= d.expiresAt) revert Expired(d.expiresAt);
        if (isClaimed(distributionId, index)) revert AlreadyClaimed(distributionId, index);

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
        if (!MerkleProof.verifyCalldata(merkleProof, d.merkleRoot, leaf)) revert InvalidProof();

        uint256 remaining = d.totalAmount - d.claimedAmount;
        if (amount > remaining) revert ExceedsDistribution(amount, remaining);

        _setClaimed(distributionId, index); // effects before interaction
        d.claimedAmount += amount;
        IERC20(d.token).safeTransfer(account, amount);

        emit Claimed(distributionId, index, account, amount);
    }

    /// @notice Return the unclaimed remainder to the funder, only after expiry.
    function sweep(uint256 distributionId, address to) external nonReentrant returns (uint256 amount) {
        Distribution storage d = _distributions[distributionId];
        if (d.token == address(0)) revert UnknownDistribution(distributionId);
        if (msg.sender != d.funder) revert NotFunder(msg.sender);
        if (block.timestamp < d.expiresAt) revert NotExpired(d.expiresAt);
        if (d.swept) revert AlreadySwept();
        if (to == address(0)) revert ZeroAddress();

        amount = d.totalAmount - d.claimedAmount;
        d.swept = true;
        if (amount != 0) {
            d.claimedAmount = d.totalAmount;
            IERC20(d.token).safeTransfer(to, amount);
        }
        emit Swept(distributionId, to, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function isClaimed(uint256 distributionId, uint256 index) public view returns (bool) {
        uint256 word = index >> 8;
        uint256 bit = index & 0xff;
        return (_claimedBitmap[distributionId][word] >> bit) & 1 == 1;
    }

    function getDistribution(uint256 distributionId) external view returns (Distribution memory) {
        Distribution memory d = _distributions[distributionId];
        if (d.token == address(0)) revert UnknownDistribution(distributionId);
        return d;
    }

    function remainingAmount(uint256 distributionId) external view returns (uint256) {
        Distribution storage d = _distributions[distributionId];
        if (d.token == address(0)) revert UnknownDistribution(distributionId);
        return d.totalAmount - d.claimedAmount;
    }

    function nextDistributionId() external view returns (uint256) {
        return _nextDistributionId;
    }

    /// @notice Leaf encoding, exposed so an off-chain tree builder can be verified against the
    ///         contract rather than trusted to match it.
    function leafFor(uint256 index, address account, uint256 amount) external pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
    }

    function _setClaimed(uint256 distributionId, uint256 index) private {
        uint256 word = index >> 8;
        uint256 bit = index & 0xff;
        // Intentional: sets the `bit`-th flag in the word. The lint flags a literal on the left
        // of a shift because `x << 1` is the more common intent, but a bitmap needs `1 << bit`.
        // forge-lint: disable-next-line(incorrect-shift)
        _claimedBitmap[distributionId][word] |= (1 << bit);
    }
}
