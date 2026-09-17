// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MerkleDistributor} from "../../src/distribution/MerkleDistributor.sol";
import {TokenVesting} from "../../src/distribution/TokenVesting.sol";
import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {TokenFactory} from "../../src/tokens/TokenFactory.sol";
import {Fixture} from "../Fixture.sol";

/// @notice Every deployable contract must fit inside the EIP-170 limit.
///
/// @dev This exists because `TokenFactory` once compiled to 59,318 bytes - more than double the
///      limit, and undeployable on any real chain - while all 182 other tests passed. Foundry
///      raises the code-size limit inside tests, so a contract that can never exist on Base or
///      BNB Chain still satisfies every functional assertion made about it. Only deploying to a
///      real node surfaced it.
///
///      Asserting the limit here means a future template added to a factory fails in the test
///      suite rather than at deployment time. CI additionally runs `forge build --sizes`.
contract CodeSizeTest is Fixture {
    /// @dev EIP-170 maximum deployed contract size, in bytes.
    uint256 internal constant EIP_170_LIMIT = 24_576;

    function setUp() public {
        _deployEcosystem();
    }

    function _assertFits(address target, string memory name) internal view {
        uint256 size = target.code.length;
        assertGt(size, 0, string.concat(name, " has no code"));
        assertLe(size, EIP_170_LIMIT, string.concat(name, " exceeds the EIP-170 code size limit"));
    }

    function test_EveryDeployedContractFitsWithinEip170() public {
        _assertFits(address(feeRouter), "FeeRouter");
        _assertFits(address(tokenFactory), "TokenFactory");
        _assertFits(address(locker), "LiquidityLocker");
        _assertFits(address(curveImpl), "BondingCurve");
        _assertFits(address(curveFactory), "BondingCurveFactory");
        _assertFits(address(presaleImpl), "Presale");
        _assertFits(address(presaleFactory), "PresaleFactory");
        _assertFits(address(nftFactory), "NftFactory");
        _assertFits(address(marketplace), "NftMarketplace");
        _assertFits(address(new TokenVesting()), "TokenVesting");
        _assertFits(address(new MerkleDistributor()), "MerkleDistributor");
    }

    /// @dev The per-template deployers are the contracts that actually carry template bytecode,
    ///      so they are the ones at risk of creeping over the limit as templates grow.
    function test_EveryTokenDeployerFitsWithinEip170() public view {
        _assertFits(tokenFactory.deployerFor(TokenFactory.Template.Standard), "StandardTokenDeployer");
        _assertFits(tokenFactory.deployerFor(TokenFactory.Template.Mintable), "MintableTokenDeployer");
        _assertFits(tokenFactory.deployerFor(TokenFactory.Template.Pausable_), "PausableTokenDeployer");
        _assertFits(
            tokenFactory.deployerFor(TokenFactory.Template.Governance), "GovernanceTokenDeployer"
        );
        _assertFits(tokenFactory.deployerFor(TokenFactory.Template.Tax), "TaxTokenDeployer");
        _assertFits(
            tokenFactory.deployerFor(TokenFactory.Template.Compliance), "ComplianceTokenDeployer"
        );
    }

    /// @dev Tokens themselves are deployed by the deployers and must also fit.
    function test_EveryTokenTemplateFitsWithinEip170() public {
        // Read the fee before pranking: an inline read here would be an external staticcall and
        // would consume the prank before the deployment call.
        uint256 fee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);

        vm.prank(creator);
        address standard = tokenFactory.deployStandard{value: fee}(
            TokenFactory.BaseParams({
                name: "Size",
                symbol: "SZ",
                supply: 1_000e18,
                recipient: creator,
                salt: keccak256("size")
            })
        );
        _assertFits(standard, "StandardToken");
    }
}
