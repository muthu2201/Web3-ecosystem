// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CurveMath} from "../src/libraries/CurveMath.sol";
import {Script} from "forge-std/Script.sol";

/// @title GenerateCurveFixtures
/// @notice Emits a JSON corpus of curve-math inputs and their exact on-chain outputs.
///
/// @dev The TypeScript client re-implements this pricing so the UI can quote a trade without an
///      RPC round trip. Two implementations of the same maths is a bug waiting to happen: a
///      rounding difference of one wei is invisible in review and shows up as a user signing a
///      transaction that reverts, or worse, executes at a price they were not shown.
///
///      This script is the defence. It runs a wide corpus - boundary values, realistic launch
///      sizes, and pseudo-random points across the whole curve - through the canonical Solidity
///      implementation and writes the results. `curve.differential.test.ts` replays the same
///      inputs through the TypeScript port and requires byte-exact equality, so the two cannot
///      drift apart without CI failing.
///
///      Run with: forge script script/GenerateCurveFixtures.s.sol
contract GenerateCurveFixtures is Script {
    struct Case {
        uint256 virtualNative;
        uint256 virtualToken;
        uint256 amount;
    }

    uint256 internal constant V_NATIVE = 1.5 ether;
    uint256 internal constant V_TOKEN = 1_073_000_000e18;
    uint256 internal constant CURVE_SUPPLY = 800_000_000e18;

    function run() external {
        Case[] memory cases = _buildCases();
        string memory json = "[";

        for (uint256 i; i < cases.length; ++i) {
            Case memory c = cases[i];
            json = string.concat(json, i == 0 ? "" : ",", _encode(c));
        }
        json = string.concat(json, "]");

        vm.writeFile("artifacts/curve-fixtures.json", json);
    }

    function _buildCases() internal pure returns (Case[] memory cases) {
        uint256[16] memory amounts = [
            uint256(1),
            2,
            3,
            999,
            1e9,
            1e12,
            1e15,
            0.001 ether,
            0.1 ether,
            0.5 ether,
            1 ether,
            2.5 ether,
            4 ether,
            10 ether,
            100 ether,
            1_000 ether
        ];

        // Reserve states sampled along the curve, so rounding is exercised at the start, the
        // middle and close to exhaustion rather than only at the launch point.
        uint256[5] memory soldFractions = [uint256(0), 10, 50, 90, 99];

        cases = new Case[](amounts.length * soldFractions.length * 2);
        uint256 n;

        for (uint256 f; f < soldFractions.length; ++f) {
            uint256 sold = (CURVE_SUPPLY * soldFractions[f]) / 100;
            uint256 vNative = V_NATIVE;
            uint256 vToken = V_TOKEN;
            if (sold > 0) {
                uint256 raised = CurveMath.nativeInForExactTokensOut(V_NATIVE, V_TOKEN, sold);
                vNative = V_NATIVE + raised;
                vToken = V_TOKEN - sold;
            }

            for (uint256 a; a < amounts.length; ++a) {
                // Native-denominated input, for buy pricing.
                cases[n++] = Case({virtualNative: vNative, virtualToken: vToken, amount: amounts[a]});
                // Token-denominated input, for sell pricing. Scaled up because a token unit is
                // worth far less than a wei of native at these reserve ratios.
                cases[n++] = Case({
                    virtualNative: vNative,
                    virtualToken: vToken,
                    amount: amounts[a] * 1_000_000
                });
            }
        }

        assembly {
            mstore(cases, n)
        }
    }

    function _encode(Case memory c) internal pure returns (string memory) {
        uint256 tokensOut = CurveMath.tokensOutForNativeIn(c.virtualNative, c.virtualToken, c.amount);
        uint256 nativeOut = CurveMath.nativeOutForTokensIn(c.virtualNative, c.virtualToken, c.amount);

        // `nativeInForExactTokensOut` reverts when the requested output reaches the virtual
        // reserve, because the price there is unbounded. Record it as null rather than skipping
        // the case, so the TypeScript port is required to reject the same inputs.
        string memory nativeIn = "null";
        if (c.amount > 0 && c.amount < c.virtualToken) {
            nativeIn = vm.toString(
                CurveMath.nativeInForExactTokensOut(c.virtualNative, c.virtualToken, c.amount)
            );
        }

        return string.concat(
            '{"virtualNative":"',
            vm.toString(c.virtualNative),
            '","virtualToken":"',
            vm.toString(c.virtualToken),
            '","amount":"',
            vm.toString(c.amount),
            '","tokensOutForNativeIn":"',
            vm.toString(tokensOut),
            '","nativeOutForTokensIn":"',
            vm.toString(nativeOut),
            '","nativeInForExactTokensOut":',
            keccak256(bytes(nativeIn)) == keccak256(bytes("null"))
                ? "null"
                : string.concat('"', nativeIn, '"'),
            ',"spotPriceX18":"',
            vm.toString(CurveMath.spotPriceX18(c.virtualNative, c.virtualToken, 1e18)),
            '"}'
        );
    }
}
