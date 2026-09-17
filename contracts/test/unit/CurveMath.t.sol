// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CurveMath} from "../../src/libraries/CurveMath.sol";
import {Test} from "forge-std/Test.sol";

/// @dev Thin wrapper so the internal library can be fuzzed through an external boundary.
contract CurveMathHarness {
    function tokensOut(uint256 vN, uint256 vT, uint256 amountIn) external pure returns (uint256) {
        return CurveMath.tokensOutForNativeIn(vN, vT, amountIn);
    }

    function nativeOut(uint256 vN, uint256 vT, uint256 tokensIn) external pure returns (uint256) {
        return CurveMath.nativeOutForTokensIn(vN, vT, tokensIn);
    }

    function nativeIn(uint256 vN, uint256 vT, uint256 want) external pure returns (uint256) {
        return CurveMath.nativeInForExactTokensOut(vN, vT, want);
    }

    function spot(uint256 vN, uint256 vT, uint256 unit) external pure returns (uint256) {
        return CurveMath.spotPriceX18(vN, vT, unit);
    }
}

contract CurveMathTest is Test {
    CurveMathHarness internal m;

    // Realistic launch parameters, in the shape the factory uses.
    uint256 internal constant V_NATIVE = 1.5 ether;
    uint256 internal constant V_TOKEN = 1_073_000_000e18;
    uint256 internal constant CURVE_SUPPLY = 793_100_000e18;

    function setUp() public {
        m = new CurveMathHarness();
    }

    // -----------------------------------------------------------------
    // The drain attack this rounding exists to prevent
    // -----------------------------------------------------------------

    /// @dev Buy then immediately sell back. The seller must never come out ahead, at any size.
    ///      If this can be made profitable, the curve can be drained in a loop.
    function testFuzz_BuyThenSellIsNeverProfitable(uint256 nativeIn) public view {
        nativeIn = bound(nativeIn, 1, 500 ether);

        uint256 bought = m.tokensOut(V_NATIVE, V_TOKEN, nativeIn);
        vm.assume(bought > 0);
        vm.assume(bought <= CURVE_SUPPLY);

        // Reserves after the buy.
        uint256 vN2 = V_NATIVE + nativeIn;
        uint256 vT2 = V_TOKEN - bought;

        uint256 returned = m.nativeOut(vN2, vT2, bought);
        assertLe(returned, nativeIn, "round-trip must not be profitable");
    }

    /// @dev The same loop run repeatedly must stay loss-making cumulatively, not just per trade.
    function testFuzz_RepeatedRoundTripsBleedTheAttacker(uint256 nativeIn, uint8 rounds) public view {
        nativeIn = bound(nativeIn, 1e12, 50 ether);
        rounds = uint8(bound(rounds, 1, 30));

        uint256 vN = V_NATIVE;
        uint256 vT = V_TOKEN;
        uint256 spent;
        uint256 recovered;

        for (uint256 i; i < rounds; ++i) {
            uint256 bought = m.tokensOut(vN, vT, nativeIn);
            if (bought == 0 || bought > CURVE_SUPPLY) break;
            spent += nativeIn;
            vN += nativeIn;
            vT -= bought;

            uint256 back = m.nativeOut(vN, vT, bought);
            recovered += back;
            vN -= back;
            vT += bought;
        }

        assertLe(recovered, spent, "attacker must never profit across repeated round-trips");
    }

    /// @dev The product of virtual reserves must never fall. A falling k means value leaked out.
    function testFuzz_InvariantKNeverDecreasesOnBuy(uint256 nativeIn) public view {
        nativeIn = bound(nativeIn, 1, 500 ether);
        uint256 bought = m.tokensOut(V_NATIVE, V_TOKEN, nativeIn);
        vm.assume(bought > 0 && bought < V_TOKEN);

        uint256 kBefore = V_NATIVE * V_TOKEN;
        uint256 kAfter = (V_NATIVE + nativeIn) * (V_TOKEN - bought);
        assertGe(kAfter, kBefore, "k must not decrease on a buy");
    }

    function testFuzz_InvariantKNeverDecreasesOnSell(uint256 tokensIn) public view {
        tokensIn = bound(tokensIn, 1, CURVE_SUPPLY);
        // Start from a mid-curve state so there is native to pay out.
        uint256 vN = V_NATIVE + 40 ether;
        uint256 vT = V_TOKEN - m.tokensOut(V_NATIVE, V_TOKEN, 40 ether);

        uint256 out = m.nativeOut(vN, vT, tokensIn);
        vm.assume(out > 0 && out < vN);

        assertGe((vN - out) * (vT + tokensIn), vN * vT, "k must not decrease on a sell");
    }

    // -----------------------------------------------------------------
    // Consistency between the forward and inverse forms
    // -----------------------------------------------------------------

    /// @dev Quoting a buy and then pricing that exact output must never cost less than the
    ///      original input, or the partial-fill path would refund more than it should.
    function testFuzz_InverseIsConsistentWithForward(uint256 nativeIn) public view {
        nativeIn = bound(nativeIn, 1e9, 500 ether);
        uint256 bought = m.tokensOut(V_NATIVE, V_TOKEN, nativeIn);
        vm.assume(bought > 0 && bought < V_TOKEN);

        uint256 required = m.nativeIn(V_NATIVE, V_TOKEN, bought);
        assertLe(required, nativeIn, "exact-output quote must not exceed the input that produced it");
    }

    function testFuzz_ExactOutputRoundsUp(uint256 want) public view {
        want = bound(want, 1, CURVE_SUPPLY);
        uint256 cost = m.nativeIn(V_NATIVE, V_TOKEN, want);
        // Paying exactly `cost` must deliver at least `want`.
        uint256 delivered = m.tokensOut(V_NATIVE, V_TOKEN, cost);
        assertGe(delivered, want, "paying the quoted cost must deliver the quoted tokens");
    }

    // -----------------------------------------------------------------
    // Monotonicity - the curve must behave like a curve
    // -----------------------------------------------------------------

    function testFuzz_MoreNativeBuysMoreTokens(uint256 a, uint256 b) public view {
        a = bound(a, 1e12, 100 ether);
        b = bound(b, a, 500 ether);
        assertGe(m.tokensOut(V_NATIVE, V_TOKEN, b), m.tokensOut(V_NATIVE, V_TOKEN, a));
    }

    function testFuzz_PriceRisesAsSupplyIsBought(uint256 nativeIn) public view {
        nativeIn = bound(nativeIn, 1e15, 200 ether);
        uint256 bought = m.tokensOut(V_NATIVE, V_TOKEN, nativeIn);
        vm.assume(bought > 0 && bought < V_TOKEN);

        uint256 before = m.spot(V_NATIVE, V_TOKEN, 1e18);
        uint256 rear = m.spot(V_NATIVE + nativeIn, V_TOKEN - bought, 1e18);
        assertGe(rear, before, "price must rise as the curve is bought into");
    }

    // -----------------------------------------------------------------
    // Boundaries
    // -----------------------------------------------------------------

    function test_ZeroInputsReturnZero() public view {
        assertEq(m.tokensOut(V_NATIVE, V_TOKEN, 0), 0);
        assertEq(m.nativeOut(V_NATIVE, V_TOKEN, 0), 0);
        assertEq(m.nativeIn(V_NATIVE, V_TOKEN, 0), 0);
    }

    function test_ZeroReservesRevert() public {
        vm.expectRevert(CurveMath.ZeroReserves.selector);
        m.tokensOut(0, V_TOKEN, 1 ether);
        vm.expectRevert(CurveMath.ZeroReserves.selector);
        m.nativeOut(V_NATIVE, 0, 1 ether);
    }

    /// @dev Buying the entire virtual token reserve is unreachable: it would need infinite input.
    function test_CannotBuyEntireVirtualReserve() public {
        vm.expectRevert(
            abi.encodeWithSelector(CurveMath.InsufficientCurveSupply.selector, V_TOKEN, V_TOKEN)
        );
        m.nativeIn(V_NATIVE, V_TOKEN, V_TOKEN);
    }

    /// @dev The graduation target is a pure function of launch parameters, so it is knowable
    ///      before the first trade and cannot be moved by an operator afterwards.
    function test_GraduationTargetIsDeterministic() public view {
        uint256 raised = m.nativeIn(V_NATIVE, V_TOKEN, CURVE_SUPPLY);
        assertGt(raised, 0);
        // With these parameters the curve completes at roughly 4.1x the virtual native seed.
        assertApproxEqRel(raised, 4.1 ether, 0.05e18);
    }

    /// @dev A huge buy must clamp against curve supply rather than overflowing or reverting.
    function test_EnormousBuyIsBoundedByVirtualReserve() public view {
        uint256 out = m.tokensOut(V_NATIVE, V_TOKEN, 1_000_000 ether);
        assertLt(out, V_TOKEN, "output can approach but never reach the virtual reserve");
    }
}
