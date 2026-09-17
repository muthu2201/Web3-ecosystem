// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title CurveMath
/// @notice Virtual-reserve constant-product pricing for the bonding curve.
///
/// @dev The invariant is `k = virtualNative * virtualToken`, held constant across every trade.
///      Virtual reserves seed the curve with a starting price without anyone having to supply
///      real capital, which is what makes a permissionless one-click launch possible.
///
/// @dev ROUNDING IS NOT COSMETIC. Every function rounds in the pool's favour:
///      tokens out and native out are rounded DOWN, native in is rounded UP. The mechanism is to
///      round the resulting *reserve* up with `ceilDiv`, which necessarily rounds the user's side
///      down. If any one of these rounded the other way, an attacker could buy and immediately
///      sell in a loop, extracting one wei of curve reserves per iteration until the curve was
///      drained. `CurveMathTest` asserts the round-trip is loss-making at every input size.
///
/// @dev OVERFLOW. `k` peaks around 1e48 for realistic parameters (1e21 wei of native against
///      1e27 token units), four orders of magnitude inside the uint256 ceiling of ~1.16e77.
///      Solidity 0.8 checked arithmetic reverts rather than wrapping if a deployment ever
///      configured reserves extreme enough to breach it.
library CurveMath {
    error InsufficientCurveSupply(uint256 requested, uint256 available);
    error ZeroReserves();

    /// @notice Tokens received for spending `nativeIn`, after fees.
    function tokensOutForNativeIn(uint256 virtualNative, uint256 virtualToken, uint256 nativeIn)
        internal
        pure
        returns (uint256 tokensOut)
    {
        if (virtualNative == 0 || virtualToken == 0) revert ZeroReserves();
        if (nativeIn == 0) return 0;
        uint256 k = virtualNative * virtualToken;
        uint256 newVirtualNative = virtualNative + nativeIn;
        // Round the remaining token reserve UP, which rounds the user's output DOWN.
        uint256 newVirtualToken = Math.ceilDiv(k, newVirtualNative);
        if (newVirtualToken >= virtualToken) return 0;
        tokensOut = virtualToken - newVirtualToken;
    }

    /// @notice Native currency received for selling `tokensIn`, before fees.
    function nativeOutForTokensIn(uint256 virtualNative, uint256 virtualToken, uint256 tokensIn)
        internal
        pure
        returns (uint256 nativeOut)
    {
        if (virtualNative == 0 || virtualToken == 0) revert ZeroReserves();
        if (tokensIn == 0) return 0;
        uint256 k = virtualNative * virtualToken;
        uint256 newVirtualToken = virtualToken + tokensIn;
        // Round the remaining native reserve UP, which rounds the user's output DOWN.
        uint256 newVirtualNative = Math.ceilDiv(k, newVirtualToken);
        if (newVirtualNative >= virtualNative) return 0;
        nativeOut = virtualNative - newVirtualNative;
    }

    /// @notice Native currency required to buy exactly `tokensOut`, before fees.
    /// @dev Used to size the final partial fill when a buy would otherwise overrun the curve
    ///      supply, so the buyer pays for exactly the tokens they get and the rest is refunded.
    function nativeInForExactTokensOut(uint256 virtualNative, uint256 virtualToken, uint256 tokensOut)
        internal
        pure
        returns (uint256 nativeIn)
    {
        if (virtualNative == 0 || virtualToken == 0) revert ZeroReserves();
        if (tokensOut == 0) return 0;
        if (tokensOut >= virtualToken) revert InsufficientCurveSupply(tokensOut, virtualToken);
        uint256 k = virtualNative * virtualToken;
        uint256 newVirtualToken = virtualToken - tokensOut;
        // Round the new native reserve UP, which rounds the user's required input UP.
        uint256 newVirtualNative = Math.ceilDiv(k, newVirtualToken);
        nativeIn = newVirtualNative - virtualNative;
    }

    /// @notice Spot price of one whole token, in native wei, scaled by 1e18.
    /// @dev A marginal price, for display only. Never used to settle a trade - settlement always
    ///      goes through the integral forms above, so a UI rounding artefact can never become a
    ///      pricing error.
    function spotPriceX18(uint256 virtualNative, uint256 virtualToken, uint256 tokenUnit)
        internal
        pure
        returns (uint256)
    {
        if (virtualToken == 0) revert ZeroReserves();
        return Math.mulDiv(virtualNative, tokenUnit, virtualToken);
    }

    /// @notice Native currency the curve will have collected once `tokensSold` have been sold.
    /// @dev Pure function of the starting parameters, so the graduation target is knowable and
    ///      verifiable before the first trade rather than being an operator-set threshold.
    function nativeRaisedAfterSelling(uint256 virtualNativeStart, uint256 virtualTokenStart, uint256 tokensSold)
        internal
        pure
        returns (uint256)
    {
        return nativeInForExactTokensOut(virtualNativeStart, virtualTokenStart, tokensSold);
    }
}
