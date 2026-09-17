// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {IUniswapV2Factory, IUniswapV2Pair, IUniswapV2Router02, IWETH} from "../interfaces/IUniswapV2.sol";
import {CurveMath} from "../libraries/CurveMath.sol";
import {LiquidityLocker} from "../liquidity/LiquidityLocker.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

/// @title BondingCurve
/// @notice Permissionless price-discovery curve that graduates into a real DEX pool.
///
/// @dev Deployed as an EIP-1167 clone of a single implementation. Clones are correct here, unlike
///      for tokens: this is platform infrastructure, every instance is byte-identical by design,
///      and a buyer verifies the implementation once rather than per launch.
///
/// @dev CUSTODY. The curve holds the entire token supply and the native currency paid in, which
///      makes it the highest-risk contract in the system. Its defences:
///
///      * No `graduationThreshold` an operator can move. The curve graduates when its supply is
///        exhausted, and the native raised at that point is a pure function of the launch
///        parameters, computable before the first trade.
///      * Reserves are tracked in storage, never read from `address(this).balance`, so donating
///        native to the contract cannot shift the price or trigger an early graduation. `receive`
///        only accepts value from the router and WETH.
///      * Every settlement path goes through `CurveMath`, which rounds in the pool's favour.
///      * `sell` is available for the whole life of the curve, so a buyer is never trapped.
///      * Fees are forwarded to `FeeRouter`, which caps them in bytecode. The curve cannot
///        charge more than 1.5% no matter what it is told.
///
/// @dev RESIDUAL RISK - PRE-SEEDED POOL. The DEX pair is created at initialisation so nobody can
///      front-run its creation, and graduation mints liquidity by calling `pair.mint()` directly
///      rather than routing through `addLiquidity`. Minting directly means stray tokens sent to
///      the pair are absorbed into it instead of causing a `quote()` revert, which removes a
///      permanent denial-of-service vector, and it leaves no dust behind. What it does not remove
///      is a well-funded attacker who buys from the curve and mints LP into the pair at a skewed
///      price before graduation: they would then hold a share of the graduated pool. Doing so
///      costs real capital at a real price and is arbitraged away, but it is not free of harm.
///      `poolPreSeeded()` reports the condition so the UI can warn before anyone trades, and the
///      threat model documents it rather than pretending it is solved.
contract BondingCurve is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    /// @notice Where burned LP goes. A burn is preferred over a lock: it is unconditional.
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @dev Upper bound on the anti-snipe window, so a launch cannot be frozen behind it.
    uint64 public constant MAX_ANTI_SNIPE_WINDOW = 1 hours;

    // --- Implementation-level immutables, shared by every clone ---------

    address public immutable factory;
    IFeeRouter public immutable feeRouter;
    IUniswapV2Router02 public immutable dexRouter;
    IUniswapV2Factory public immutable dexFactory;
    IWETH public immutable weth;
    LiquidityLocker public immutable locker;

    // --- Per-clone state ------------------------------------------------

    struct Params {
        address token;
        address creator;
        uint256 curveSupply;
        uint256 lpSupply;
        uint256 virtualNativeStart;
        uint256 virtualTokenStart;
        uint64 antiSnipeWindow;
        uint256 maxBuyDuringWindow;
        bool lockLpInsteadOfBurn;
        uint64 lpLockDuration;
    }

    IERC20 public token;
    address public creator;
    address public pair;

    uint256 public curveSupply;
    uint256 public lpSupply;
    uint256 public virtualNativeReserve;
    uint256 public virtualTokenReserve;

    /// @notice Native currency actually collected by the curve, net of fees. Storage-tracked so a
    ///         direct transfer to this contract cannot influence pricing or graduation.
    uint256 public realNativeReserve;

    uint256 public tokensSold;
    uint64 public launchedAt;
    uint64 public antiSnipeEndsAt;
    uint256 public maxBuyDuringWindow;
    bool public lockLpInsteadOfBurn;
    uint64 public lpLockDuration;
    bool public graduated;
    bool private _initialized;

    mapping(address buyer => uint256 nativeSpent) public spentDuringWindow;

    event Initialized(address indexed token, address indexed creator, address indexed pair, Params params);
    event Bought(
        address indexed buyer,
        uint256 nativeIn,
        uint256 tokensOut,
        uint256 fee,
        uint256 refund,
        uint256 newVirtualNative,
        uint256 newVirtualToken
    );
    event Sold(
        address indexed seller,
        uint256 tokensIn,
        uint256 nativeOut,
        uint256 fee,
        uint256 newVirtualNative,
        uint256 newVirtualToken
    );
    event Graduated(
        address indexed pair,
        uint256 tokensToPool,
        uint256 nativeToPool,
        uint256 liquidity,
        uint256 graduationFee,
        bool lpLocked,
        uint256 lockId
    );

    error AlreadyInitialized();
    error NotFactory();
    error NotInitialized();
    error AlreadyGraduated();
    error NotGraduated();
    error DeadlinePassed(uint256 deadline);
    error ZeroAmount();
    error SlippageExceeded(uint256 got, uint256 minimum);
    error CurveExhausted();
    error AntiSnipeCapExceeded(uint256 attempted, uint256 cap);
    error InvalidParams(string reason);
    error InsufficientTokenBalance(uint256 have, uint256 need);
    error NativeTransferFailed();
    error UnexpectedNativeSender(address sender);
    error NoLiquidityMinted();

    constructor(
        address factory_,
        IFeeRouter feeRouter_,
        IUniswapV2Router02 dexRouter_,
        LiquidityLocker locker_
    ) {
        factory = factory_;
        feeRouter = feeRouter_;
        dexRouter = dexRouter_;
        dexFactory = IUniswapV2Factory(dexRouter_.factory());
        weth = IWETH(dexRouter_.WETH());
        locker = locker_;
        // The implementation itself must never be initialisable.
        _initialized = true;
    }

    // ---------------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------------

    /// @notice Configure a freshly cloned curve. Callable exactly once, only by the factory.
    /// @dev The factory must have transferred `curveSupply + lpSupply` tokens to this clone first;
    ///      the balance is verified here rather than assumed.
    function initialize(Params calldata p) external {
        if (_initialized) revert AlreadyInitialized();
        if (msg.sender != factory) revert NotFactory();
        if (p.token == address(0) || p.creator == address(0)) revert InvalidParams("zero address");
        if (p.curveSupply == 0 || p.lpSupply == 0) revert InvalidParams("zero supply");
        if (p.virtualNativeStart == 0 || p.virtualTokenStart == 0) revert InvalidParams("zero reserve");
        // The virtual reserve must strictly exceed what is for sale, or the final buy would need
        // infinite input and the curve could never graduate.
        if (p.virtualTokenStart <= p.curveSupply) revert InvalidParams("virtual token <= curve supply");
        if (p.antiSnipeWindow > MAX_ANTI_SNIPE_WINDOW) revert InvalidParams("anti-snipe window too long");

        uint256 needed = p.curveSupply + p.lpSupply;
        uint256 have = IERC20(p.token).balanceOf(address(this));
        if (have < needed) revert InsufficientTokenBalance(have, needed);

        // The raise at full sale must cover the graduation fee, or graduation could never settle.
        uint256 raiseAtCompletion =
            CurveMath.nativeRaisedAfterSelling(p.virtualNativeStart, p.virtualTokenStart, p.curveSupply);
        uint256 gradFee = feeRouter.flatNativeOf(IFeeRouter.Product.Graduation);
        if (raiseAtCompletion <= gradFee) revert InvalidParams("raise cannot cover graduation fee");

        _initialized = true;
        token = IERC20(p.token);
        creator = p.creator;
        curveSupply = p.curveSupply;
        lpSupply = p.lpSupply;
        virtualNativeReserve = p.virtualNativeStart;
        virtualTokenReserve = p.virtualTokenStart;
        launchedAt = uint64(block.timestamp);
        antiSnipeEndsAt = uint64(block.timestamp) + p.antiSnipeWindow;
        maxBuyDuringWindow = p.maxBuyDuringWindow;
        lockLpInsteadOfBurn = p.lockLpInsteadOfBurn;
        lpLockDuration = p.lpLockDuration;

        // Create the pair now, while no tokens are in circulation, so pair creation cannot be
        // front-run and the graduation target address is known from the start.
        address existing = dexFactory.getPair(p.token, address(weth));
        pair = existing == address(0) ? dexFactory.createPair(p.token, address(weth)) : existing;

        emit Initialized(p.token, p.creator, pair, p);
    }

    // ---------------------------------------------------------------------
    // Trading
    // ---------------------------------------------------------------------

    /// @notice Buy tokens from the curve with native currency.
    /// @param minTokensOut Revert if fewer tokens than this would be delivered.
    /// @param deadline Revert after this timestamp.
    /// @return tokensOut Tokens delivered to the caller.
    /// @dev If the requested amount would overrun the remaining curve supply, the buy is filled
    ///      partially at the exact cost of the remaining tokens and the unused native is refunded,
    ///      with the fee charged only on the portion actually used.
    function buy(uint256 minTokensOut, uint256 deadline)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        _requireActive(deadline);
        if (msg.value == 0) revert ZeroAmount();

        uint256 remaining = curveSupply - tokensSold;
        if (remaining == 0) revert CurveExhausted();

        uint16 feeBps = feeRouter.bpsOf(IFeeRouter.Product.BondingCurveTrade);
        uint256 grossUsed = msg.value;
        uint256 fee = (grossUsed * feeBps) / 10_000;
        uint256 netIn = grossUsed - fee;

        tokensOut = CurveMath.tokensOutForNativeIn(virtualNativeReserve, virtualTokenReserve, netIn);

        uint256 refund;
        if (tokensOut > remaining) {
            // Partial fill: price the remaining supply exactly, then gross the fee back up so the
            // buyer is charged the same rate on a smaller base rather than on their full input.
            tokensOut = remaining;
            netIn = CurveMath.nativeInForExactTokensOut(
                virtualNativeReserve, virtualTokenReserve, tokensOut
            );
            grossUsed = feeBps == 0 ? netIn : Math.ceilDiv(netIn * 10_000, 10_000 - feeBps);
            if (grossUsed > msg.value) {
                // Rounding pushed the grossed-up cost past what was sent; fall back to spending
                // everything, which can only deliver fewer tokens than `remaining`.
                grossUsed = msg.value;
                fee = (grossUsed * feeBps) / 10_000;
                netIn = grossUsed - fee;
                tokensOut =
                    CurveMath.tokensOutForNativeIn(virtualNativeReserve, virtualTokenReserve, netIn);
            } else {
                fee = grossUsed - netIn;
            }
            refund = msg.value - grossUsed;
        }

        if (tokensOut == 0) revert ZeroAmount();
        if (tokensOut < minTokensOut) revert SlippageExceeded(tokensOut, minTokensOut);

        _enforceAntiSnipe(grossUsed);

        // Effects
        virtualNativeReserve += netIn;
        virtualTokenReserve -= tokensOut;
        realNativeReserve += netIn;
        tokensSold += tokensOut;

        // Interactions
        if (fee != 0) {
            feeRouter.routeNative{value: fee}(IFeeRouter.Product.BondingCurveTrade, creator);
        }
        token.safeTransfer(msg.sender, tokensOut);
        if (refund != 0) _sendNative(msg.sender, refund);

        emit Bought(
            msg.sender, grossUsed, tokensOut, fee, refund, virtualNativeReserve, virtualTokenReserve
        );

        if (tokensSold == curveSupply) _graduate();
    }

    /// @notice Sell tokens back to the curve for native currency.
    /// @dev Available for the entire life of the curve. A buyer is never locked in.
    function sell(uint256 tokensIn, uint256 minNativeOut, uint256 deadline)
        external
        nonReentrant
        returns (uint256 nativeOut)
    {
        _requireActive(deadline);
        if (tokensIn == 0) revert ZeroAmount();
        if (tokensIn > tokensSold) revert InsufficientTokenBalance(tokensSold, tokensIn);

        uint256 grossOut =
            CurveMath.nativeOutForTokensIn(virtualNativeReserve, virtualTokenReserve, tokensIn);
        if (grossOut == 0) revert ZeroAmount();
        // Cannot pay out more than was ever collected.
        if (grossOut > realNativeReserve) revert InsufficientTokenBalance(realNativeReserve, grossOut);

        uint256 fee = (grossOut * feeRouter.bpsOf(IFeeRouter.Product.BondingCurveTrade)) / 10_000;
        nativeOut = grossOut - fee;
        if (nativeOut < minNativeOut) revert SlippageExceeded(nativeOut, minNativeOut);

        // Effects
        virtualNativeReserve -= grossOut;
        virtualTokenReserve += tokensIn;
        realNativeReserve -= grossOut;
        tokensSold -= tokensIn;

        // Interactions
        token.safeTransferFrom(msg.sender, address(this), tokensIn);
        if (fee != 0) {
            feeRouter.routeNative{value: fee}(IFeeRouter.Product.BondingCurveTrade, creator);
        }
        _sendNative(msg.sender, nativeOut);

        emit Sold(msg.sender, tokensIn, nativeOut, fee, virtualNativeReserve, virtualTokenReserve);
    }

    // ---------------------------------------------------------------------
    // Graduation
    // ---------------------------------------------------------------------

    /// @dev Moves every remaining asset into the DEX pair and burns or locks the resulting LP.
    ///      Liquidity is minted by calling `pair.mint()` directly rather than through the router:
    ///      the curve is the intended first minter, there is no price to slip against, no dust is
    ///      left behind, and stray tokens sent to the pair are absorbed instead of bricking the
    ///      router's `quote()`.
    function _graduate() private {
        graduated = true;

        uint256 gradFee = feeRouter.flatNativeOf(IFeeRouter.Product.Graduation);
        uint256 nativeForPool = realNativeReserve;
        if (gradFee > nativeForPool) gradFee = nativeForPool; // cannot overdraw; checked at init
        nativeForPool -= gradFee;
        realNativeReserve = 0;

        uint256 tokensForPool = token.balanceOf(address(this));

        if (gradFee != 0) {
            feeRouter.routeNative{value: gradFee}(IFeeRouter.Product.Graduation, creator);
        }

        // Move both sides into the pair, then mint.
        token.safeTransfer(pair, tokensForPool);
        weth.deposit{value: nativeForPool}();
        // WETH9 returns a bool; route through SafeERC20 so a non-standard WETH on some chain
        // cannot silently fail and leave the pair with only one side funded.
        IERC20(address(weth)).safeTransfer(pair, nativeForPool);

        address lpRecipient = lockLpInsteadOfBurn ? address(this) : BURN_ADDRESS;
        uint256 liquidity = IUniswapV2Pair(pair).mint(lpRecipient);
        if (liquidity == 0) revert NoLiquidityMinted();

        uint256 lockId;
        if (lockLpInsteadOfBurn) {
            IUniswapV2Pair(pair).approve(address(locker), liquidity);
            lockId = locker.lock(
                pair, liquidity, uint64(block.timestamp) + lpLockDuration, creator
            );
        }

        emit Graduated(
            pair, tokensForPool, nativeForPool, liquidity, gradFee, lockLpInsteadOfBurn, lockId
        );
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Tokens a buy of `nativeIn` would deliver right now, after fees.
    function quoteBuy(uint256 nativeIn) external view returns (uint256 tokensOut, uint256 fee) {
        fee = (nativeIn * feeRouter.bpsOf(IFeeRouter.Product.BondingCurveTrade)) / 10_000;
        tokensOut =
            CurveMath.tokensOutForNativeIn(virtualNativeReserve, virtualTokenReserve, nativeIn - fee);
        uint256 remaining = curveSupply - tokensSold;
        if (tokensOut > remaining) tokensOut = remaining;
    }

    /// @notice Native a sell of `tokensIn` would return right now, after fees.
    function quoteSell(uint256 tokensIn) external view returns (uint256 nativeOut, uint256 fee) {
        uint256 gross = CurveMath.nativeOutForTokensIn(virtualNativeReserve, virtualTokenReserve, tokensIn);
        fee = (gross * feeRouter.bpsOf(IFeeRouter.Product.BondingCurveTrade)) / 10_000;
        nativeOut = gross - fee;
    }

    /// @notice Spot price of one whole token in native wei, scaled by 1e18.
    function spotPriceX18() external view returns (uint256) {
        return CurveMath.spotPriceX18(virtualNativeReserve, virtualTokenReserve, 1e18);
    }

    /// @notice Fraction of the curve sold so far, in basis points.
    function progressBps() external view returns (uint256) {
        return (tokensSold * 10_000) / curveSupply;
    }

    /// @notice Native the curve will hold at graduation, known before the first trade.
    function graduationTarget() external view returns (uint256) {
        return CurveMath.nativeRaisedAfterSelling(
            virtualNativeReserve, virtualTokenReserve, curveSupply - tokensSold
        ) + realNativeReserve;
    }

    /// @notice True if someone has already put liquidity into the pair ahead of graduation.
    /// @dev Surfaced so the UI can warn traders before they buy rather than after they are stuck.
    function poolPreSeeded() external view returns (bool) {
        if (pair == address(0)) return false;
        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        return r0 != 0 || r1 != 0;
    }

    function remainingSupply() external view returns (uint256) {
        return curveSupply - tokensSold;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _requireActive(uint256 deadline) private view {
        if (!_initialized || address(token) == address(0)) revert NotInitialized();
        if (graduated) revert AlreadyGraduated();
        if (block.timestamp > deadline) revert DeadlinePassed(deadline);
    }

    /// @dev Caps cumulative spend per address during the opening window. Contract callers are
    ///      deliberately NOT blocked: smart-contract wallets (ERC-4337, EIP-7702) are ordinary
    ///      users, and an `extcodesize` check would lock them out while barely inconveniencing a
    ///      snipers' EOA swarm.
    ///
    ///      The factory is exempt. A creator's opening buy is relayed by the factory, so without
    ///      this every dev buy would be metered against the factory's bucket instead of the
    ///      creator's and would silently truncate at the window cap. The dev buy is not left
    ///      unbounded by the exemption - `BondingCurveFactory` caps it at a share of the launch's
    ///      eventual raise, under a ceiling compiled into that contract.
    function _enforceAntiSnipe(uint256 grossUsed) private {
        if (msg.sender == factory) return;
        if (block.timestamp >= antiSnipeEndsAt || maxBuyDuringWindow == 0) return;
        uint256 spent = spentDuringWindow[msg.sender] + grossUsed;
        if (spent > maxBuyDuringWindow) revert AntiSnipeCapExceeded(spent, maxBuyDuringWindow);
        spentDuringWindow[msg.sender] = spent;
    }

    function _sendNative(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    /// @dev Only the router and WETH may send native currency here - the router when refunding and
    ///      WETH when unwrapping. Rejecting everything else keeps donations from ever landing in
    ///      the contract, though pricing reads storage and would ignore them regardless.
    receive() external payable {
        if (msg.sender != address(dexRouter) && msg.sender != address(weth)) {
            revert UnexpectedNativeSender(msg.sender);
        }
    }
}
