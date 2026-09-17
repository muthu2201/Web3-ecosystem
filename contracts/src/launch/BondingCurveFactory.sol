// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {CurveMath} from "../libraries/CurveMath.sol";
import {StandardToken} from "../tokens/StandardToken.sol";
import {BondingCurve} from "./BondingCurve.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LibClone} from "solady/utils/LibClone.sol";

/// @title BondingCurveFactory
/// @notice One-click degen launch: deploy token, clone a curve, seed it, optionally buy in.
///
/// @dev The token deployed here is always `StandardToken` - fixed supply, ownerless, untaxed,
///      unmintable, unfreezable. That is not a default a user can override; it is the only token
///      this factory knows how to build. A launchpad that let people put a tax or a blocklist on
///      a one-click meme launch would be a rug factory, so the capability simply is not wired up.
///
/// @dev The entire supply is minted directly to the curve clone, whose address is known before
///      the token exists. No intermediate account ever holds the supply, so there is no window in
///      which the factory or the creator could divert it.
contract BondingCurveFactory is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Hard ceiling on how much of a launch's eventual raise the creator may buy up front.
    ///      Compiled in, so no configuration change can let a creator front-run their own launch
    ///      harder than this.
    uint16 public constant MAX_DEV_BUY_CAP_BPS = 2500; // 25%

    /// @dev Floor on an LP lock, when the creator locks rather than burns.
    uint64 public constant MIN_LP_LOCK_DURATION = 30 days;

    /// @notice Curve implementation every launch is cloned from.
    /// @dev Set exactly once, after deployment, then frozen forever. The factory and the curve
    ///      implementation each need the other's address as an immutable, which is circular; a
    ///      one-time setter breaks the cycle without leaving a standing power behind. Shipping a
    ///      new curve version means deploying a new factory, so no owner action can ever change
    ///      the code a future launch will run - a mutable implementation pointer would be a
    ///      supply-chain backdoor into every launch that came after it.
    address public curveImplementation;

    IFeeRouter public immutable feeRouter;

    /// @notice Launch parameters applied to new curves. Changing these never affects a live curve.
    struct CurveConfig {
        uint256 totalSupply;
        uint256 curveSupply;
        uint256 virtualNativeStart;
        uint256 virtualTokenStart;
        uint64 antiSnipeWindow;
        uint256 maxBuyDuringWindow;
        uint16 devBuyCapBps;
    }

    CurveConfig public config;

    struct LaunchParams {
        string name;
        string symbol;
        bool lockLpInsteadOfBurn;
        uint64 lpLockDuration;
        uint256 devBuyValue;
        uint256 devBuyMinTokensOut;
        bytes32 salt;
    }

    mapping(address curve => bool) public isCurve;
    mapping(address token => address curve) public curveOfToken;
    address[] private _allCurves;

    event CurveLaunched(
        address indexed curve,
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 devBuyValue,
        uint256 devTokensReceived
    );
    event ConfigUpdated(CurveConfig config);
    event CurveImplementationSet(address indexed implementation);

    error InsufficientValue(uint256 provided, uint256 required);
    error DevBuyExceedsCap(uint256 attempted, uint256 cap);
    error InvalidConfig(string reason);
    error LockDurationTooShort(uint64 provided, uint64 minimum);
    error RefundFailed();
    error UnexpectedNativeSender(address sender);
    error ImplementationAlreadySet();
    error ImplementationNotSet();
    error ZeroAddress();

    constructor(address initialOwner, IFeeRouter feeRouter_, CurveConfig memory config_) Ownable(initialOwner) {
        if (address(feeRouter_) == address(0)) revert ZeroAddress();
        feeRouter = feeRouter_;
        _setConfig(config_);
    }

    /// @notice Bind the curve implementation. Callable once, by the owner, and never again.
    function setCurveImplementation(address implementation) external onlyOwner {
        if (implementation == address(0)) revert ZeroAddress();
        if (curveImplementation != address(0)) revert ImplementationAlreadySet();
        curveImplementation = implementation;
        emit CurveImplementationSet(implementation);
    }

    // ---------------------------------------------------------------------
    // Launch
    // ---------------------------------------------------------------------

    /// @notice Deploy a token and its curve, and optionally make the creator's first buy atomically.
    /// @dev `msg.value` must cover the flat deploy fee plus any dev buy. Anything left is refunded.
    function launch(LaunchParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address curveAddr, address tokenAddr)
    {
        if (curveImplementation == address(0)) revert ImplementationNotSet();
        if (p.lockLpInsteadOfBurn && p.lpLockDuration < MIN_LP_LOCK_DURATION) {
            revert LockDurationTooShort(p.lpLockDuration, MIN_LP_LOCK_DURATION);
        }

        {
            uint256 required = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy) + p.devBuyValue;
            if (msg.value < required) revert InsufficientValue(msg.value, required);
        }
        _enforceDevBuyCap(config, p.devBuyValue);

        (curveAddr, tokenAddr) = _deployAndSeed(p);

        isCurve[curveAddr] = true;
        curveOfToken[tokenAddr] = curveAddr;
        _allCurves.push(curveAddr);

        uint256 deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        if (deployFee != 0) {
            feeRouter.routeNative{value: deployFee}(IFeeRouter.Product.TokenDeploy, address(0));
        }

        uint256 devTokens = _devBuy(curveAddr, tokenAddr, p);

        _refundRemainder();

        emit CurveLaunched(curveAddr, tokenAddr, msg.sender, p.name, p.symbol, p.devBuyValue, devTokens);
    }

    /// @dev Clones the curve, mints the whole supply straight into it, then initialises it.
    ///      Split out of `launch` purely to stay inside the EVM stack limit.
    function _deployAndSeed(LaunchParams calldata p) private returns (address curveAddr, address tokenAddr) {
        CurveConfig memory c = config;
        bytes32 salt = keccak256(abi.encode(msg.sender, p.salt));

        // The curve address is fixed before the token exists, so the supply is minted directly to
        // its final home and no intermediate account can ever divert it.
        curveAddr = LibClone.cloneDeterministic(curveImplementation, salt);
        tokenAddr = address(new StandardToken{salt: salt}(p.name, p.symbol, c.totalSupply, curveAddr, msg.sender));

        BondingCurve(payable(curveAddr))
            .initialize(
                BondingCurve.Params({
                    token: tokenAddr,
                    creator: msg.sender,
                    curveSupply: c.curveSupply,
                    lpSupply: c.totalSupply - c.curveSupply,
                    virtualNativeStart: c.virtualNativeStart,
                    virtualTokenStart: c.virtualTokenStart,
                    antiSnipeWindow: c.antiSnipeWindow,
                    maxBuyDuringWindow: c.maxBuyDuringWindow,
                    lockLpInsteadOfBurn: p.lockLpInsteadOfBurn,
                    lpLockDuration: p.lpLockDuration
                })
            );
    }

    /// @dev Performs the creator's opening buy and forwards the tokens straight to them, so the
    ///      factory never retains a position in a launch it created.
    /// @dev The value goes to a curve this function just created, and the refund goes to
    ///      msg.sender's own overpayment. Neither destination is caller-controlled.
    // slither-disable-next-line arbitrary-send-eth
    function _devBuy(address curveAddr, address tokenAddr, LaunchParams calldata p)
        private
        returns (uint256 devTokens)
    {
        if (p.devBuyValue == 0) return 0;
        devTokens = BondingCurve(payable(curveAddr)).buy{value: p.devBuyValue}(p.devBuyMinTokensOut, block.timestamp);
        IERC20(tokenAddr).safeTransfer(msg.sender, devTokens);
    }

    /// @dev Returns overpayment plus any partial-fill refund the curve sent back.
    // slither-disable-next-line arbitrary-send-eth
    function _refundRemainder() private {
        uint256 leftover = address(this).balance;
        // Exact equality is correct: with nothing left over there is simply no refund to send.
        // slither-disable-next-line incorrect-equality
        if (leftover == 0) return;
        (bool ok,) = msg.sender.call{value: leftover}("");
        if (!ok) revert RefundFailed();
    }

    /// @notice Curve address a launch would land on, so the UI can show it before signing.
    function predictCurveAddress(address creator, bytes32 userSalt) external view returns (address) {
        return LibClone.predictDeterministicAddress(
            curveImplementation, keccak256(abi.encode(creator, userSalt)), address(this)
        );
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function totalCurves() external view returns (uint256) {
        return _allCurves.length;
    }

    function curvesPaged(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 len = _allCurves.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _allCurves[offset + i];
        }
    }

    /// @notice Native a curve launched with the current config will hold at graduation.
    function graduationTargetForNewLaunch() external view returns (uint256) {
        CurveConfig memory c = config;
        return CurveMath.nativeRaisedAfterSelling(c.virtualNativeStart, c.virtualTokenStart, c.curveSupply);
    }

    // ---------------------------------------------------------------------
    // Admin - affects future launches only
    // ---------------------------------------------------------------------

    function setConfig(CurveConfig calldata config_) external onlyOwner {
        _setConfig(config_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setConfig(CurveConfig memory c) private {
        if (c.totalSupply == 0 || c.curveSupply == 0) revert InvalidConfig("zero supply");
        if (c.curveSupply >= c.totalSupply) revert InvalidConfig("curve supply must leave LP supply");
        if (c.virtualTokenStart <= c.curveSupply) revert InvalidConfig("virtual token <= curve supply");
        if (c.virtualNativeStart == 0) revert InvalidConfig("zero virtual native");
        if (c.antiSnipeWindow > 1 hours) revert InvalidConfig("anti-snipe window too long");
        if (c.devBuyCapBps > MAX_DEV_BUY_CAP_BPS) revert InvalidConfig("dev buy cap above hard ceiling");
        config = c;
        emit ConfigUpdated(c);
    }

    function _enforceDevBuyCap(CurveConfig memory c, uint256 devBuyValue) private pure {
        if (devBuyValue == 0) return;
        uint256 target = CurveMath.nativeRaisedAfterSelling(c.virtualNativeStart, c.virtualTokenStart, c.curveSupply);
        uint256 cap = (target * c.devBuyCapBps) / 10_000;
        if (devBuyValue > cap) revert DevBuyExceedsCap(devBuyValue, cap);
    }

    /// @dev Only curves this factory created may push native currency back (partial-fill refunds
    ///      during an atomic dev buy). Everything else is rejected.
    receive() external payable {
        if (!isCurve[msg.sender]) revert UnexpectedNativeSender(msg.sender);
    }
}
