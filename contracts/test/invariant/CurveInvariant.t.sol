// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BondingCurve} from "../../src/launch/BondingCurve.sol";
import {Fixture} from "../Fixture.sol";
import {CurveHandler} from "./handlers/CurveHandler.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Stateful invariants for the bonding curve.
/// @dev Unit tests check known scenarios. These check properties that must hold after ANY
///      sequence of buys, sells and time jumps the fuzzer can construct, which is where the
///      accounting bugs that survive scenario testing actually live.
contract CurveInvariantTest is Fixture {
    CurveHandler internal handler;

    /// @dev Read through the handler, not cached: the handler rotates to a fresh curve whenever
    ///      one graduates, and an invariant holding a stale reference would stop testing anything.
    function curve() internal view returns (BondingCurve) {
        return handler.curve();
    }

    function token() internal view returns (IERC20) {
        return handler.token();
    }

    function setUp() public {
        _deployEcosystem();

        address[] memory actors = new address[](4);
        actors[0] = alice;
        actors[1] = bob;
        actors[2] = carol;
        actors[3] = makeAddr("dave");

        handler = new CurveHandler(curveFactory, feeRouter, creator, actors);
        targetContract(address(handler));

        // Keep the fuzzer inside the handler; direct calls would bypass its ghost accounting.
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = CurveHandler.buy.selector;
        selectors[1] = CurveHandler.sell.selector;
        selectors[2] = CurveHandler.advanceTime.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @dev SOLVENCY. Before graduation the curve must hold exactly the native it says it holds.
    ///      A shortfall means it has promised money it cannot pay; a surplus means untracked
    ///      value is sitting in the contract and will be swept into the pool by accident.
    function invariant_BalanceEqualsTrackedReserve() public view {
        if (curve().graduated()) return;
        assertEq(address(curve()).balance, curve().realNativeReserve(), "curve balance must match reserve");
    }

    /// @dev The virtual native reserve is the starting seed plus everything really collected.
    function invariant_VirtualReserveTracksRealReserve() public view {
        if (curve().graduated()) return;
        assertEq(
            curve().virtualNativeReserve() - V_NATIVE_START,
            curve().realNativeReserve(),
            "virtual and real reserves must stay in lockstep"
        );
    }

    /// @dev The curve can never sell more than it was funded to sell.
    function invariant_TokensSoldNeverExceedsCurveSupply() public view {
        assertLe(curve().tokensSold(), curve().curveSupply(), "oversold the curve");
    }

    /// @dev Token conservation: everything is either still in the curve, in the pool, or held by
    ///      someone. Nothing is minted or lost along the way.
    function invariant_TokenSupplyIsConserved() public view {
        uint256 total = token().totalSupply();
        uint256 inCurve = token().balanceOf(address(curve()));
        uint256 inPool = token().balanceOf(curve().pair());

        uint256 held;
        uint256 n = handler.actorCount();
        for (uint256 i; i < n; ++i) {
            held += token().balanceOf(handler.actors(i));
        }
        held += token().balanceOf(creator);
        held += token().balanceOf(address(curveFactory));

        assertEq(inCurve + inPool + held, total, "tokens must be conserved across the system");
    }

    /// @dev The constant-product invariant must never fall. A falling k is value leaking out of
    ///      the curve, which is exactly what a rounding-direction bug looks like.
    function invariant_ConstantProductNeverDecreases() public view {
        if (curve().graduated()) return;
        uint256 k = curve().virtualNativeReserve() * curve().virtualTokenReserve();
        assertGe(k, V_NATIVE_START * V_TOKEN_START, "k must never fall below its starting value");
    }

    /// @dev Traders can never extract more native from the curve than they put in. If this fails,
    ///      the curve is being drained.
    function invariant_TradersNeverExtractMoreThanTheyPutIn() public view {
        assertLe(
            handler.ghostNativeOut(), handler.ghostNativeIn(), "aggregate payout must never exceed aggregate deposits"
        );
    }

    /// @dev Once graduated the curve must be fully drained - no stranded native, no stranded
    ///      tokens, everything moved into the pool.
    function invariant_GraduatedCurveRetainsNothing() public view {
        if (!curve().graduated()) return;
        assertEq(address(curve()).balance, 0, "no native stranded after graduation");
        assertEq(token().balanceOf(address(curve())), 0, "no tokens stranded after graduation");
        assertEq(curve().realNativeReserve(), 0);
    }

    /// @dev Fees credited to the router must always be backed by real native currency held there.
    function invariant_FeeRouterIsSolvent() public view {
        uint256 credited = feeRouter.balanceOf(treasury, address(0)) + feeRouter.balanceOf(creator, address(0));
        assertLe(credited, address(feeRouter).balance, "router owes more than it holds");
    }

    /// @dev Guards against a vacuous run. If the fuzzer never actually traded, or never drove a
    ///      curve to graduation, every invariant above would pass while testing nothing.
    ///
    ///      This lives in `afterInvariant` rather than in an `invariant_` function because
    ///      Foundry evaluates invariants immediately after `setUp` too, when no calls have run
    ///      yet - an `invariant_` version would fail before the fuzzer had done anything.
    ///      `afterInvariant` runs once at the end of each campaign, which is when "was this run
    ///      substantive?" is actually a meaningful question.
    function afterInvariant() public view {
        assertGt(handler.buyCount(), 0, "no buys executed - invariants would be vacuous");
        assertGt(handler.sellCount(), 0, "no sells executed - invariants would be vacuous");
        // Foundry rolls state back between runs, so these counters describe the final run
        // rather than the whole campaign. The assertion is therefore that EVERY run is
        // substantive, which is the stronger property and the reason buy sizing is tuned
        // against the graduation target in the handler.
        assertGt(handler.graduationCount(), 0, "no curve reached graduation - the migration path was never exercised");
    }
}
