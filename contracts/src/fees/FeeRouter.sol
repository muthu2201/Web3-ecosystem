// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "./IFeeRouter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FeeRouter
/// @author Web3 Ecosystem
/// @notice Single, non-custodial collection point for every platform fee.
///
/// @dev Three properties make the platform's fee promise credible without trusting the operator:
///
///      1. HARD CAPS IN BYTECODE. `maxBps` is `pure` and `flatNativeHardCap` is `immutable`.
///         No owner, no proxy and no governance action can raise a fee past these ceilings,
///         because there is no code path that writes them. The contract is non-upgradeable.
///      2. TIMELOCK. Every parameter change is a two-phase propose/execute separated by an
///         immutable delay, so users always have advance notice of a fee change.
///      3. PULL-OVER-PUSH. Fees accrue to an internal balance and are withdrawn by the
///         beneficiary. A malicious or reverting creator address can never block a trade.
///
///      The router only ever receives the fee itself. Trade principal never enters this contract.
contract FeeRouter is IFeeRouter, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Basis-point denominator.
    uint16 internal constant BPS_DENOMINATOR = 10_000;

    /// @dev Absolute ceiling for the per-chain flat-fee ceiling chosen at deployment.
    ///      Bounds operator discretion even on a chain whose native token appreciates sharply.
    uint256 public constant ABSOLUTE_FLAT_NATIVE_CEILING = 0.02 ether;

    /// @dev Bounds for the timelock delay chosen at deployment.
    uint64 public constant MIN_TIMELOCK_DELAY = 24 hours;
    uint64 public constant MAX_TIMELOCK_DELAY = 30 days;

    /// @notice Sentinel used in balance bookkeeping for the chain's native currency.
    address public constant NATIVE = address(0);

    /// @inheritdoc IFeeRouter
    uint256 public immutable flatNativeHardCap;

    /// @inheritdoc IFeeRouter
    uint64 public immutable timelockDelay;

    /// @inheritdoc IFeeRouter
    address public treasury;

    mapping(Product => FeeConfig) private _feeConfig;

    /// @dev account => token => accrued, withdrawable balance.
    mapping(address => mapping(address => uint256)) private _balance;

    struct PendingFeeConfig {
        FeeConfig config;
        uint64 eta;
    }

    struct PendingTreasury {
        address treasury;
        uint64 eta;
    }

    mapping(Product => PendingFeeConfig) private _pendingFeeConfig;
    PendingTreasury private _pendingTreasury;

    /// @param initialOwner Safe multisig that administers the router.
    /// @param initialTreasury Safe multisig that receives the platform's share.
    /// @param flatNativeHardCap_ Per-chain ceiling for flat fees, bounded by ABSOLUTE_FLAT_NATIVE_CEILING.
    /// @param timelockDelay_ Delay between proposing and executing any parameter change.
    constructor(address initialOwner, address initialTreasury, uint256 flatNativeHardCap_, uint64 timelockDelay_)
        Ownable(initialOwner)
    {
        if (initialTreasury == address(0)) revert ZeroAddress();
        if (flatNativeHardCap_ > ABSOLUTE_FLAT_NATIVE_CEILING) {
            revert FeeExceedsHardCap(flatNativeHardCap_, ABSOLUTE_FLAT_NATIVE_CEILING);
        }
        if (timelockDelay_ < MIN_TIMELOCK_DELAY || timelockDelay_ > MAX_TIMELOCK_DELAY) {
            revert FeeExceedsHardCap(timelockDelay_, MAX_TIMELOCK_DELAY);
        }
        treasury = initialTreasury;
        flatNativeHardCap = flatNativeHardCap_;
        timelockDelay = timelockDelay_;
        emit TreasuryExecuted(initialTreasury);
    }

    // ---------------------------------------------------------------------
    // Hard caps - pure, unreachable by any setter
    // ---------------------------------------------------------------------

    /// @inheritdoc IFeeRouter
    /// @dev These ceilings are compiled into the bytecode. There is deliberately no setter.
    function maxBps(Product product) public pure returns (uint16) {
        if (product == Product.BondingCurveTrade) return 150; // 1.50%
        if (product == Product.Swap) return 100; // 1.00%
        if (product == Product.Presale) return 300; // 3.00%
        if (product == Product.FairLaunch) return 200; // 2.00%
        if (product == Product.NftMint) return 200; // 2.00%
        if (product == Product.NftMarketplace) return 100; // 1.00%
        return 0; // TokenDeploy, Graduation, NftDeploy are flat-fee products
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IFeeRouter
    function feeConfig(Product product) external view returns (FeeConfig memory) {
        return _feeConfig[product];
    }

    /// @inheritdoc IFeeRouter
    function bpsOf(Product product) public view returns (uint16) {
        return _feeConfig[product].bps;
    }

    /// @inheritdoc IFeeRouter
    function flatNativeOf(Product product) public view returns (uint256) {
        return _feeConfig[product].flatNative;
    }

    /// @inheritdoc IFeeRouter
    function feeOn(Product product, uint256 amount) public view returns (uint256) {
        return (amount * _feeConfig[product].bps) / BPS_DENOMINATOR;
    }

    /// @inheritdoc IFeeRouter
    function balanceOf(address account, address token) external view returns (uint256) {
        return _balance[account][token];
    }

    function pendingFeeConfig(Product product) external view returns (FeeConfig memory config, uint64 eta) {
        PendingFeeConfig storage p = _pendingFeeConfig[product];
        return (p.config, p.eta);
    }

    function pendingTreasury() external view returns (address newTreasury, uint64 eta) {
        return (_pendingTreasury.treasury, _pendingTreasury.eta);
    }

    // ---------------------------------------------------------------------
    // Timelocked administration
    // ---------------------------------------------------------------------

    /// @notice Stage a fee change for `product`. Reverts immediately if it breaches a hard cap,
    ///         so an over-cap proposal can never even be queued.
    function proposeFeeConfig(Product product, FeeConfig calldata config) external onlyOwner {
        _validate(product, config);
        uint64 eta = uint64(block.timestamp) + timelockDelay;
        _pendingFeeConfig[product] = PendingFeeConfig({config: config, eta: eta});
        emit FeeConfigProposed(product, config, eta);
    }

    /// @notice Apply a staged fee change once its timelock has elapsed.
    function executeFeeConfig(Product product) external onlyOwner {
        PendingFeeConfig memory p = _pendingFeeConfig[product];
        if (p.eta == 0) revert NoPendingProposal();
        if (block.timestamp < p.eta) revert TimelockNotElapsed(p.eta);
        // Re-validate on execution: caps are pure, but this keeps the invariant local and explicit.
        _validate(product, p.config);
        delete _pendingFeeConfig[product];
        _feeConfig[product] = p.config;
        emit FeeConfigExecuted(product, p.config);
    }

    function cancelFeeConfig(Product product) external onlyOwner {
        if (_pendingFeeConfig[product].eta == 0) revert NoPendingProposal();
        delete _pendingFeeConfig[product];
        emit FeeConfigProposalCancelled(product);
    }

    /// @notice Lowering a fee is always safe for users, so it bypasses the timelock.
    ///         Raising a fee is impossible through this path.
    function lowerFeeImmediately(Product product, uint16 newBps, uint128 newFlatNative) external onlyOwner {
        FeeConfig storage current = _feeConfig[product];
        if (newBps > current.bps) revert FeeExceedsHardCap(newBps, current.bps);
        if (newFlatNative > current.flatNative) revert FeeExceedsHardCap(newFlatNative, current.flatNative);
        current.bps = newBps;
        current.flatNative = newFlatNative;
        emit FeeConfigExecuted(product, current);
    }

    function proposeTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        uint64 eta = uint64(block.timestamp) + timelockDelay;
        _pendingTreasury = PendingTreasury({treasury: newTreasury, eta: eta});
        emit TreasuryProposed(newTreasury, eta);
    }

    function executeTreasury() external onlyOwner {
        PendingTreasury memory p = _pendingTreasury;
        if (p.eta == 0) revert NoPendingProposal();
        if (block.timestamp < p.eta) revert TimelockNotElapsed(p.eta);
        delete _pendingTreasury;
        treasury = p.treasury;
        emit TreasuryExecuted(p.treasury);
    }

    function cancelTreasury() external onlyOwner {
        address queued = _pendingTreasury.treasury;
        if (_pendingTreasury.eta == 0) revert NoPendingProposal();
        delete _pendingTreasury;
        emit TreasuryProposalCancelled(queued);
    }

    function _validate(Product product, FeeConfig memory config) private view {
        uint16 cap = maxBps(product);
        if (config.bps > cap) revert FeeExceedsHardCap(config.bps, cap);
        if (config.creatorShareBps > BPS_DENOMINATOR) revert ShareExceedsTotal(config.creatorShareBps);
        if (config.flatNative > flatNativeHardCap) {
            revert FeeExceedsHardCap(config.flatNative, flatNativeHardCap);
        }
    }

    // ---------------------------------------------------------------------
    // Fee intake
    // ---------------------------------------------------------------------

    /// @inheritdoc IFeeRouter
    function routeNative(Product product, address creator) external payable {
        if (msg.value == 0) revert ZeroAmount();
        _credit(product, NATIVE, creator, msg.value);
    }

    /// @inheritdoc IFeeRouter
    /// @dev Credits the amount actually received, so fee-on-transfer fee tokens cannot
    ///      desynchronise internal accounting from the contract's real balance.
    function routeERC20(Product product, address token, address creator, uint256 amount) external {
        if (token == NATIVE) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        // Exact equality is correct: this rejects a transfer that delivered literally nothing,
        // which is what a fully-taxing or non-compliant token does. Any non-zero amount is
        // credited as-is.
        // slither-disable-next-line incorrect-equality
        if (received == 0) revert ZeroAmount();
        _credit(product, token, creator, received);
    }

    function _credit(Product product, address token, address creator, uint256 amount) private {
        // Intentionally defaults to zero: with no creator, the whole fee goes to the treasury.
        // slither-disable-next-line uninitialized-local
        uint256 creatorAmount;
        if (creator != address(0)) {
            creatorAmount = (amount * _feeConfig[product].creatorShareBps) / BPS_DENOMINATOR;
        }
        uint256 treasuryAmount = amount - creatorAmount;
        if (creatorAmount != 0) {
            _balance[creator][token] += creatorAmount;
        }
        if (treasuryAmount != 0) {
            _balance[treasury][token] += treasuryAmount;
        }
        emit FeeRouted(product, token, creator, creatorAmount, treasuryAmount);
    }

    // ---------------------------------------------------------------------
    // Withdrawal (pull)
    // ---------------------------------------------------------------------

    /// @inheritdoc IFeeRouter
    function withdraw(address token, address to) external nonReentrant returns (uint256 amount) {
        if (to == address(0)) revert ZeroAddress();
        amount = _balance[msg.sender][token];
        if (amount == 0) revert NothingToWithdraw();
        _balance[msg.sender][token] = 0; // effects before interaction
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit Withdrawn(msg.sender, token, to, amount);
    }

    /// @dev No `receive` or `fallback`: native currency can only enter through `routeNative`,
    ///      which always credits it to an account. Funds can therefore never become stranded.
}
