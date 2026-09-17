// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {IUniswapV2Factory, IUniswapV2Pair, IUniswapV2Router02, IWETH} from "../interfaces/IUniswapV2.sol";
import {LiquidityLocker} from "../liquidity/LiquidityLocker.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Presale
/// @notice Soft-cap / hard-cap token sale with automatic refunds and automatic pool seeding.
///
/// @dev THE FAILURE MODE THIS CONTRACT EXISTS TO PREVENT is a presale that raises money and then
///      simply does not deliver. The defences are structural, not procedural:
///
///      * The sale is funded with tokens BEFORE it can accept a single contribution. `initialize`
///        verifies the contract already holds enough tokens to cover every buyer at the hard cap
///        plus the liquidity allocation. A sale that cannot pay out cannot open.
///      * The owner has no withdrawal path while the sale is live, and none at all if it fails.
///        On failure, the ONLY function that moves native currency is `refund`, callable by each
///        contributor for their own deposit.
///      * Finalisation is atomic: in one transaction the pool is created and seeded, the LP is
///        locked or burned, the platform fee is taken, and only then is the remainder released to
///        the owner. There is no intermediate state where the owner holds the raise but the pool
///        does not exist.
///      * `liquidityBps` is fixed at initialisation. The share of the raise going into the pool
///        cannot be reduced after people have contributed against it.
///
/// @dev Deployed as an EIP-1167 clone by `PresaleFactory`.
contract Presale is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @dev At least half the raise must go into the pool. A presale that routes most of the money
    ///      to the team and leaves a thin pool is the shape almost every exit scam takes.
    uint16 public constant MIN_LIQUIDITY_BPS = 5000;

    /// @dev Floor on the LP lock when the sale locks rather than burns.
    uint64 public constant MIN_LP_LOCK_DURATION = 30 days;

    /// @dev Bounds on the sale window, so a sale cannot be opened indefinitely or retroactively.
    uint64 public constant MIN_DURATION = 1 hours;
    uint64 public constant MAX_DURATION = 90 days;

    enum State {
        Pending, // configured, window not yet open
        Live, // accepting contributions
        AwaitingFinalisation, // closed at or above soft cap, waiting for finalise()
        Succeeded, // finalised: pool seeded, tokens claimable
        Failed // closed below soft cap or cancelled: refunds open
    }

    address public immutable factory;
    IFeeRouter public immutable feeRouter;
    IUniswapV2Router02 public immutable dexRouter;
    IUniswapV2Factory public immutable dexFactory;
    IWETH public immutable weth;
    LiquidityLocker public immutable locker;

    struct Params {
        address token;
        address owner;
        uint256 tokensPerNative; // sale rate, scaled by 1e18
        uint256 liquidityTokensPerNative; // pool rate, scaled by 1e18
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint64 startsAt;
        uint64 endsAt;
        uint16 liquidityBps;
        bool lockLpInsteadOfBurn;
        uint64 lpLockDuration;
        bytes32 whitelistRoot; // zero for a public sale
        bool isFairLaunch;
    }

    IERC20 public token;
    address public owner;
    uint256 public tokensPerNative;
    uint256 public liquidityTokensPerNative;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public minContribution;
    uint256 public maxContribution;
    uint64 public startsAt;
    uint64 public endsAt;
    uint16 public liquidityBps;
    bool public lockLpInsteadOfBurn;
    uint64 public lpLockDuration;
    bytes32 public whitelistRoot;
    bool public isFairLaunch;

    uint256 public totalRaised;
    uint256 public totalTokensSold;
    bool public finalised;
    bool public cancelled;
    bool private _initialized;

    mapping(address contributor => uint256 amount) public contributionOf;
    mapping(address contributor => bool claimed) public hasClaimed;
    mapping(address contributor => bool refunded) public hasRefunded;
    address[] private _contributors;

    event Initialized(address indexed token, address indexed owner, Params params);
    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event Claimed(address indexed contributor, uint256 tokenAmount);
    event Refunded(address indexed contributor, uint256 amount);
    event Finalised(
        uint256 totalRaised,
        uint256 platformFee,
        uint256 toLiquidity,
        uint256 toOwner,
        address pair,
        uint256 liquidity,
        uint256 lockId
    );
    event Cancelled();

    error AlreadyInitialized();
    error NotFactory();
    error NotOwner();
    error InvalidParams(string reason);
    error NotLive();
    error SaleNotEnded();
    error SaleEnded();
    error SoftCapNotReached();
    error SoftCapReached();
    error HardCapExceeded(uint256 attempted, uint256 room);
    error BelowMinContribution(uint256 amount, uint256 minimum);
    error AboveMaxContribution(uint256 total, uint256 maximum);
    error NotWhitelisted();
    error NothingToClaim();
    error NothingToRefund();
    error AlreadyFinalised();
    error AlreadyCancelled();
    error InsufficientTokenFunding(uint256 have, uint256 need);
    error NativeTransferFailed();
    error UnexpectedNativeSender(address sender);
    error NoLiquidityMinted();

    constructor(address factory_, IFeeRouter feeRouter_, IUniswapV2Router02 dexRouter_, LiquidityLocker locker_) {
        factory = factory_;
        feeRouter = feeRouter_;
        dexRouter = dexRouter_;
        dexFactory = IUniswapV2Factory(dexRouter_.factory());
        weth = IWETH(dexRouter_.WETH());
        locker = locker_;
        _initialized = true; // the implementation is never initialisable
    }

    // ---------------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------------

    function initialize(Params calldata p) external {
        if (_initialized) revert AlreadyInitialized();
        if (msg.sender != factory) revert NotFactory();
        _validate(p);

        // The sale must already hold every token it could owe: buyers at the hard cap, plus the
        // liquidity allocation. Verified against the real balance, never assumed.
        uint256 needed = _tokensNeeded(p);
        uint256 have = IERC20(p.token).balanceOf(address(this));
        if (have < needed) revert InsufficientTokenFunding(have, needed);

        _initialized = true;
        token = IERC20(p.token);
        owner = p.owner;
        tokensPerNative = p.tokensPerNative;
        liquidityTokensPerNative = p.liquidityTokensPerNative;
        softCap = p.softCap;
        hardCap = p.hardCap;
        minContribution = p.minContribution;
        maxContribution = p.maxContribution;
        startsAt = p.startsAt;
        endsAt = p.endsAt;
        liquidityBps = p.liquidityBps;
        lockLpInsteadOfBurn = p.lockLpInsteadOfBurn;
        lpLockDuration = p.lpLockDuration;
        whitelistRoot = p.whitelistRoot;
        isFairLaunch = p.isFairLaunch;

        emit Initialized(p.token, p.owner, p);
    }

    function _validate(Params calldata p) private view {
        if (p.token == address(0) || p.owner == address(0)) revert InvalidParams("zero address");
        if (p.tokensPerNative == 0 || p.liquidityTokensPerNative == 0) revert InvalidParams("zero rate");
        if (p.softCap == 0 || p.hardCap < p.softCap) revert InvalidParams("bad caps");
        if (p.minContribution == 0 || p.maxContribution < p.minContribution) {
            revert InvalidParams("bad contribution bounds");
        }
        if (p.startsAt < block.timestamp) revert InvalidParams("start in the past");
        if (p.endsAt <= p.startsAt + MIN_DURATION) revert InvalidParams("duration too short");
        if (p.endsAt > p.startsAt + MAX_DURATION) revert InvalidParams("duration too long");
        if (p.liquidityBps < MIN_LIQUIDITY_BPS || p.liquidityBps > 10_000) {
            revert InvalidParams("liquidity share out of range");
        }
        if (p.lockLpInsteadOfBurn && p.lpLockDuration < MIN_LP_LOCK_DURATION) {
            revert InvalidParams("lp lock too short");
        }
        // The pool must not be priced above the sale, or the first seller instantly dumps below
        // the price buyers paid.
        if (p.liquidityTokensPerNative > p.tokensPerNative) {
            revert InvalidParams("pool rate above sale rate");
        }
    }

    /// @notice Tokens a sale must hold before it can open, given its parameters.
    function tokensNeeded(Params calldata p) external pure returns (uint256) {
        return _tokensNeeded(p);
    }

    /// @dev The division before multiplication is deliberate and load-bearing. `_seedPool`
    ///      computes the pool's token amount with exactly the same two steps and the same
    ///      truncation at each one, and the function is monotonically non-decreasing in the
    ///      raise. Since the raise can never exceed the hard cap, funding computed here always
    ///      covers what finalisation actually consumes. Reordering for precision would make this
    ///      figure disagree with the one the contract later uses, which is the failure this
    ///      arrangement avoids.
    // slither-disable-next-line divide-before-multiply
    function _tokensNeeded(Params calldata p) private pure returns (uint256) {
        uint256 forBuyers = (p.hardCap * p.tokensPerNative) / 1e18;
        uint256 nativeToPool = (p.hardCap * p.liquidityBps) / 10_000;
        uint256 forPool = (nativeToPool * p.liquidityTokensPerNative) / 1e18;
        return forBuyers + forPool;
    }

    // ---------------------------------------------------------------------
    // Contributing
    // ---------------------------------------------------------------------

    /// @notice Contribute to the sale. `proof` is required only when a whitelist root is set.
    function contribute(bytes32[] calldata proof) external payable nonReentrant {
        if (state() != State.Live) revert NotLive();
        if (msg.value == 0) revert BelowMinContribution(0, minContribution);

        if (whitelistRoot != bytes32(0)) {
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
            if (!MerkleProof.verifyCalldata(proof, whitelistRoot, leaf)) revert NotWhitelisted();
        }

        uint256 room = hardCap - totalRaised;
        if (msg.value > room) revert HardCapExceeded(msg.value, room);

        uint256 prior = contributionOf[msg.sender];
        uint256 total = prior + msg.value;
        if (total < minContribution) revert BelowMinContribution(total, minContribution);
        if (total > maxContribution) revert AboveMaxContribution(total, maxContribution);

        if (prior == 0) _contributors.push(msg.sender);
        contributionOf[msg.sender] = total;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    // ---------------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------------

    /// @notice Close a successful sale: seed the pool, lock or burn LP, take the fee, pay the owner.
    /// @dev Permissionless once the conditions are met. The owner cannot stall a successful sale
    ///      to strand contributors, and cannot finalise a failed one to keep the money.
    function finalise() external nonReentrant {
        State s = state();
        if (s == State.Succeeded) revert AlreadyFinalised();
        if (s == State.Failed) revert SoftCapNotReached();
        if (s != State.AwaitingFinalisation) revert SaleNotEnded();

        finalised = true;

        uint256 raised = totalRaised;
        IFeeRouter.Product product = isFairLaunch ? IFeeRouter.Product.FairLaunch : IFeeRouter.Product.Presale;
        uint256 platformFee = feeRouter.feeOn(product, raised);
        uint256 toLiquidity = (raised * liquidityBps) / 10_000;
        // The fee is taken from the owner's share, never from the liquidity allocation, so the
        // pool is always seeded with exactly what contributors were promised.
        uint256 toOwner = raised - toLiquidity - platformFee;

        totalTokensSold = (raised * tokensPerNative) / 1e18;

        (address pair, uint256 liquidity, uint256 lockId) = _seedPool(toLiquidity);

        if (platformFee != 0) {
            feeRouter.routeNative{value: platformFee}(product, owner);
        }
        if (toOwner != 0) _sendNative(owner, toOwner);

        // Return tokens that were funded for the unsold portion of the hard cap.
        uint256 leftover = token.balanceOf(address(this)) - _tokensOwedToBuyers();
        if (leftover != 0) token.safeTransfer(owner, leftover);

        emit Finalised(raised, platformFee, toLiquidity, toOwner, pair, liquidity, lockId);
    }

    function _seedPool(uint256 nativeForPool) private returns (address pair, uint256 liquidity, uint256 lockId) {
        uint256 tokensForPool = (nativeForPool * liquidityTokensPerNative) / 1e18;

        pair = dexFactory.getPair(address(token), address(weth));
        if (pair == address(0)) pair = dexFactory.createPair(address(token), address(weth));

        // Mint directly against the pair, as the curve does: no dust, and a stray transfer to the
        // pair cannot brick the router's quote and strand a successful sale.
        token.safeTransfer(pair, tokensForPool);
        weth.deposit{value: nativeForPool}();
        IERC20(address(weth)).safeTransfer(pair, nativeForPool);

        address lpRecipient = lockLpInsteadOfBurn ? address(this) : BURN_ADDRESS;
        liquidity = IUniswapV2Pair(pair).mint(lpRecipient);
        if (liquidity == 0) revert NoLiquidityMinted();

        if (lockLpInsteadOfBurn) {
            // See BondingCurve._graduate: checked approval, for the same reason.
            IERC20(pair).forceApprove(address(locker), liquidity);
            lockId = locker.lock(pair, liquidity, uint64(block.timestamp) + lpLockDuration, owner);
        }
    }

    /// @notice Claim purchased tokens after a successful sale.
    function claim() external nonReentrant returns (uint256 amount) {
        if (!finalised) revert SoftCapNotReached();
        if (hasClaimed[msg.sender]) revert NothingToClaim();

        uint256 contributed = contributionOf[msg.sender];
        if (contributed == 0) revert NothingToClaim();

        amount = (contributed * tokensPerNative) / 1e18;
        hasClaimed[msg.sender] = true; // effects before interaction
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Reclaim a contribution from a failed or cancelled sale.
    /// @dev The only path that moves native currency out of a failed sale, and it can only send a
    ///      contributor their own deposit.
    function refund() external nonReentrant returns (uint256 amount) {
        if (state() != State.Failed) revert SoftCapReached();
        if (hasRefunded[msg.sender]) revert NothingToRefund();

        amount = contributionOf[msg.sender];
        if (amount == 0) revert NothingToRefund();

        hasRefunded[msg.sender] = true; // effects before interaction
        contributionOf[msg.sender] = 0;
        _sendNative(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    /// @notice Cancel a sale that has not yet become finalisable, opening refunds immediately.
    /// @dev Once the sale is finalisable - soft cap reached and either the window closed or the
    ///      hard cap hit - it is owed to its contributors and the owner loses the ability to
    ///      cancel. Without this, an owner could watch a sale succeed and then cancel it to
    ///      unwind a launch they had changed their mind about, after contributors were committed.
    function cancel() external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        State s = state();
        if (s == State.Succeeded) revert AlreadyFinalised();
        if (s == State.Failed) revert AlreadyCancelled();
        if (s == State.AwaitingFinalisation) revert SoftCapReached();
        cancelled = true;
        emit Cancelled();
    }

    /// @notice Recover unsold tokens from a failed or cancelled sale.
    /// @dev Moves tokens only. Contributors' native currency is never reachable from here.
    function recoverTokens() external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        if (state() != State.Failed) revert SoftCapReached();
        uint256 balance = token.balanceOf(address(this));
        if (balance != 0) token.safeTransfer(owner, balance);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @dev A sale is finalisable as soon as EITHER its window closes or its hard cap is hit,
    ///      provided the soft cap was reached. Anything else at that point has failed.
    function state() public view returns (State) {
        if (cancelled) return State.Failed;
        if (finalised) return State.Succeeded;
        if (block.timestamp < startsAt) return State.Pending;

        bool windowClosed = block.timestamp >= endsAt;
        bool hardCapHit = totalRaised >= hardCap;
        if (!windowClosed && !hardCapHit) return State.Live;

        return totalRaised >= softCap ? State.AwaitingFinalisation : State.Failed;
    }

    /// @notice Tokens `who` will receive if the sale succeeds.
    function allocationOf(address who) public view returns (uint256) {
        return (contributionOf[who] * tokensPerNative) / 1e18;
    }

    function contributorCount() external view returns (uint256) {
        return _contributors.length;
    }

    function contributorsPaged(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 len = _contributors.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _contributors[offset + i];
        }
    }

    function progressBps() external view returns (uint256) {
        return hardCap == 0 ? 0 : (totalRaised * 10_000) / hardCap;
    }

    function softCapReached() external view returns (bool) {
        return totalRaised >= softCap;
    }

    function _tokensOwedToBuyers() private view returns (uint256) {
        return (totalRaised * tokensPerNative) / 1e18;
    }

    /// @dev `to` is the sale owner on finalise, or the caller reclaiming their own contribution
    ///      on refund. Never an address supplied by an untrusted caller.
    // slither-disable-next-line arbitrary-send-eth
    function _sendNative(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    /// @dev Contributions must arrive through `contribute`, which records them. Value sent any
    ///      other way would be unattributable and therefore unrefundable, so it is rejected.
    receive() external payable {
        if (msg.sender != address(dexRouter) && msg.sender != address(weth)) {
            revert UnexpectedNativeSender(msg.sender);
        }
    }
}
