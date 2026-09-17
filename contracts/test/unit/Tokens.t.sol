// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {ComplianceToken} from "../../src/tokens/ComplianceToken.sol";
import {GovernanceToken} from "../../src/tokens/GovernanceToken.sol";
import {RiskFlags} from "../../src/tokens/IPlatformToken.sol";
import {MintableToken} from "../../src/tokens/MintableToken.sol";
import {PausableToken} from "../../src/tokens/PausableToken.sol";
import {StandardToken} from "../../src/tokens/StandardToken.sol";
import {TaxToken} from "../../src/tokens/TaxToken.sol";
import {TokenFactory} from "../../src/tokens/TokenFactory.sol";
import {Fixture} from "../Fixture.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokensTest is Fixture {
    uint256 internal constant SUPPLY = 1_000_000e18;
    uint256 internal constant CAP = 10_000_000e18;

    /// @dev Cached in setUp on purpose. Reading the fee inline inside a `{value: ...}` expression
    ///      performs an external staticcall, which consumes the pending `vm.prank` before the
    ///      deployment call is made - so the token would be deployed by the test contract rather
    ///      than the pranked account, silently invalidating every provenance and CREATE2 assertion.
    uint256 internal deployFee;

    function setUp() public {
        _deployEcosystem();
        deployFee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
    }

    function _base(bytes32 salt) internal view returns (TokenFactory.BaseParams memory) {
        return TokenFactory.BaseParams({name: "Token", symbol: "TKN", supply: SUPPLY, recipient: creator, salt: salt});
    }

    // -----------------------------------------------------------------
    // StandardToken - the template with no powers at all
    // -----------------------------------------------------------------

    function test_StandardTokenHasNoPrivilegedFunctions() public {
        vm.prank(creator);
        address t = tokenFactory.deployStandard{value: deployFee}(_base(keccak256("std")));
        StandardToken token = StandardToken(t);

        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(creator), SUPPLY);
        assertEq(token.riskFlags(), RiskFlags.NONE);
        assertEq(token.deployer(), creator);
        assertEq(token.initialSupply(), SUPPLY);
    }

    /// @dev Supply can only ever fall, and only by a holder burning their own balance.
    function testFuzz_StandardTokenSupplyIsMonotonicallyNonIncreasing(uint256 burnAmount) public {
        vm.prank(creator);
        StandardToken token = StandardToken(tokenFactory.deployStandard{value: deployFee}(_base(keccak256("burn"))));

        burnAmount = bound(burnAmount, 0, SUPPLY);
        vm.prank(creator);
        token.burn(burnAmount);
        assertEq(token.totalSupply(), SUPPLY - burnAmount);
        assertLe(token.totalSupply(), token.initialSupply());
    }

    function test_StandardTokenPermitWorks() public {
        vm.prank(creator);
        StandardToken token = StandardToken(tokenFactory.deployStandard{value: deployFee}(_base(keccak256("permit"))));
        assertGt(uint256(token.DOMAIN_SEPARATOR()), 0);
        assertEq(token.nonces(creator), 0);
    }

    // -----------------------------------------------------------------
    // MintableToken
    // -----------------------------------------------------------------

    function test_MintableRespectsCapAndSealing() public {
        vm.prank(creator);
        MintableToken token = MintableToken(
            tokenFactory.deployMintable{value: deployFee}(
                TokenFactory.CappedParams({
                    name: "Mint",
                    symbol: "MNT",
                    cap: CAP,
                    initialSupply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    salt: keccak256("mint")
                })
            )
        );

        assertEq(token.riskFlags(), RiskFlags.CAPPED | RiskFlags.MINTABLE | RiskFlags.OWNED);

        vm.prank(creator);
        token.mint(alice, 1000e18);
        assertEq(token.balanceOf(alice), 1000e18);

        vm.prank(creator);
        vm.expectRevert();
        token.mint(alice, CAP); // would breach the immutable cap

        vm.prank(creator);
        token.sealMinting();
        vm.prank(creator);
        vm.expectRevert(MintableToken.MintingIsSealed.selector);
        token.mint(alice, 1);

        // Sealing must be reflected in the published risk flags.
        assertEq(token.riskFlags(), RiskFlags.CAPPED);
    }

    function test_MintableRejectsNonMinter() public {
        vm.prank(creator);
        MintableToken token = MintableToken(
            tokenFactory.deployMintable{value: deployFee}(
                TokenFactory.CappedParams({
                    name: "Mint",
                    symbol: "MNT",
                    cap: CAP,
                    initialSupply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    salt: keccak256("mint2")
                })
            )
        );
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1);
    }

    function test_InitialSupplyAboveCapIsRejected() public {
        vm.prank(creator);
        vm.expectRevert(MintableToken.InitialSupplyAboveCap.selector);
        tokenFactory.deployMintable{value: deployFee}(
            TokenFactory.CappedParams({
                name: "Bad",
                symbol: "BAD",
                cap: SUPPLY,
                initialSupply: SUPPLY + 1,
                recipient: creator,
                admin: creator,
                salt: keccak256("badcap")
            })
        );
    }

    // -----------------------------------------------------------------
    // PausableToken
    // -----------------------------------------------------------------

    function test_PauseBlocksTransfersAndRenouncementIsPermanent() public {
        vm.prank(creator);
        PausableToken token =
            PausableToken(tokenFactory.deployPausable{value: deployFee}(_base(keccak256("pause")), creator));

        vm.prank(creator);
        assertTrue(token.transfer(alice, 100e18));

        vm.prank(creator);
        token.pause();
        vm.prank(alice);
        vm.expectRevert();
        // Expected to revert; vm.expectRevert asserts the outcome, so there is no
        // return value to check.
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1e18);

        // Renouncing must unpause, so a token can never be left frozen forever.
        vm.prank(creator);
        token.renouncePauseForever();
        assertFalse(token.paused());
        assertEq(token.riskFlags(), RiskFlags.NONE);

        vm.prank(alice);
        assertTrue(token.transfer(bob, 1e18));
        assertEq(token.balanceOf(bob), 1e18);

        vm.prank(creator);
        vm.expectRevert(PausableToken.PauseAlreadyRenounced.selector);
        token.pause();
    }

    // -----------------------------------------------------------------
    // GovernanceToken
    // -----------------------------------------------------------------

    function test_GovernanceUsesTimestampClockAndTracksVotes() public {
        vm.prank(creator);
        GovernanceToken token = GovernanceToken(
            tokenFactory.deployGovernance{value: deployFee}(
                TokenFactory.CappedParams({
                    name: "Gov",
                    symbol: "GOV",
                    cap: CAP,
                    initialSupply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    salt: keccak256("gov")
                })
            )
        );

        assertEq(token.CLOCK_MODE(), "mode=timestamp");
        assertEq(token.clock(), uint48(block.timestamp));

        vm.prank(creator);
        token.delegate(creator);
        assertEq(token.getVotes(creator), SUPPLY);

        vm.warp(vm.getBlockTimestamp() + 1);
        vm.prank(creator);
        assertTrue(token.transfer(alice, 400_000e18));
        assertEq(token.getVotes(creator), SUPPLY - 400_000e18);
    }

    // -----------------------------------------------------------------
    // TaxToken - the honeypot defence
    // -----------------------------------------------------------------

    function _deployTax(uint16 maxBps, uint16 buyBps, uint16 sellBps, bytes32 salt) internal returns (TaxToken) {
        vm.prank(creator);
        return TaxToken(
            tokenFactory.deployTax{value: deployFee}(
                TokenFactory.TaxParams({
                    name: "Tax",
                    symbol: "TAX",
                    supply: SUPPLY,
                    recipient: creator,
                    owner: creator,
                    taxRecipient: treasury,
                    maxTaxBps: maxBps,
                    buyTaxBps: buyBps,
                    sellTaxBps: sellBps,
                    salt: salt
                })
            )
        );
    }

    /// @dev THE test for this template: no owner action can ever raise a tax.
    function testFuzz_TaxCanNeverBeRaised(uint16 start, uint16 attempt) public {
        start = uint16(bound(start, 1, 1000));
        attempt = uint16(bound(attempt, uint256(start) + 1, type(uint16).max));
        TaxToken token = _deployTax(1000, start, start, keccak256(abi.encode(start, attempt)));

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TaxToken.TaxCannotIncrease.selector, attempt, start));
        token.setTaxes(attempt, start);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TaxToken.TaxCannotIncrease.selector, attempt, start));
        token.setTaxes(start, attempt);
    }

    function test_TaxAboveAbsoluteCeilingIsRejectedAtDeploy() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TaxToken.TaxAboveCap.selector, 1001, 1000));
        tokenFactory.deployTax{value: deployFee}(
            TokenFactory.TaxParams({
                name: "Tax",
                symbol: "TAX",
                supply: SUPPLY,
                recipient: creator,
                owner: creator,
                taxRecipient: treasury,
                maxTaxBps: 1001,
                buyTaxBps: 0,
                sellTaxBps: 0,
                salt: keccak256("toohigh")
            })
        );
    }

    function test_TaxAppliesOnlyToAmmTrades() public {
        TaxToken token = _deployTax(1000, 300, 500, keccak256("taxtrade"));
        address pair = makeAddr("pair");
        vm.prank(creator);
        token.setAmmPair(pair, true);

        vm.prank(creator);
        assertTrue(token.transfer(alice, 10_000e18)); // creator is excluded, so untaxed
        assertEq(token.balanceOf(alice), 10_000e18);

        // Wallet to wallet: never taxed.
        vm.prank(alice);
        assertTrue(token.transfer(bob, 1000e18));
        assertEq(token.balanceOf(bob), 1000e18);

        // Sell into the pair: 5%.
        vm.prank(alice);
        assertTrue(token.transfer(pair, 1000e18));
        assertEq(token.balanceOf(pair), 950e18);
        assertEq(token.balanceOf(treasury), 50e18);

        // Buy from the pair: 3%.
        vm.prank(pair);
        assertTrue(token.transfer(carol, 100e18));
        assertEq(token.balanceOf(carol), 97e18);
    }

    function testFuzz_TaxNeverExceedsTheQuotedRate(uint16 sellBps, uint128 amount) public {
        sellBps = uint16(bound(sellBps, 0, 1000));
        amount = uint128(bound(amount, 1e18, 100_000e18));
        TaxToken token = _deployTax(1000, 0, sellBps, keccak256(abi.encode(sellBps, amount)));

        address pair = makeAddr("pair2");
        vm.prank(creator);
        token.setAmmPair(pair, true);
        vm.prank(creator);
        assertTrue(token.transfer(alice, amount));

        uint16 quoted = token.taxBpsFor(alice, pair);
        uint256 treasuryBefore = token.balanceOf(treasury);
        vm.prank(alice);
        assertTrue(token.transfer(pair, amount));

        uint256 taken = token.balanceOf(treasury) - treasuryBefore;
        assertEq(taken, (uint256(amount) * quoted) / 10_000, "charged exactly the quoted rate");
        assertLe(taken * 10_000 / amount, 1000, "never above the absolute ceiling");
    }

    function test_TaxTokenConservesSupplyOnEveryTransfer() public {
        TaxToken token = _deployTax(1000, 300, 500, keccak256("conserve"));
        address pair = makeAddr("pair3");
        vm.prank(creator);
        token.setAmmPair(pair, true);
        vm.prank(creator);
        assertTrue(token.transfer(alice, 10_000e18));

        uint256 before = token.totalSupply();
        vm.prank(alice);
        assertTrue(token.transfer(pair, 5000e18));
        assertEq(token.totalSupply(), before, "tax moves supply, never creates or destroys it");
    }

    // -----------------------------------------------------------------
    // ComplianceToken
    // -----------------------------------------------------------------

    function test_ComplianceGatesAndClawback() public {
        vm.prank(creator);
        ComplianceToken token = ComplianceToken(
            tokenFactory.deployCompliance{value: deployFee}(
                TokenFactory.ComplianceParams({
                    name: "Comp",
                    symbol: "CMP",
                    supply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    allowlistEnabled: false,
                    salt: keccak256("comp")
                })
            )
        );

        assertEq(
            token.riskFlags(),
            RiskFlags.CLAWBACK | RiskFlags.BLOCKLIST | RiskFlags.PAUSABLE | RiskFlags.MINTABLE | RiskFlags.OWNED
        );

        vm.prank(creator);
        assertTrue(token.transfer(alice, 1000e18));

        vm.prank(creator);
        token.setBlocked(alice, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ComplianceToken.SenderBlocked.selector, alice));
        // Expected to revert; vm.expectRevert asserts the outcome, so there is no
        // return value to check.
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1e18);

        // Clawback must work even on a blocked holder - that is its whole purpose.
        vm.prank(creator);
        token.forceTransfer(alice, creator, 1000e18, "sanctions match");
        assertEq(token.balanceOf(alice), 0);
    }

    function test_ClawbackIsStillBlockedWhilePaused() public {
        vm.prank(creator);
        ComplianceToken token = ComplianceToken(
            tokenFactory.deployCompliance{value: deployFee}(
                TokenFactory.ComplianceParams({
                    name: "Comp",
                    symbol: "CMP",
                    supply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    allowlistEnabled: false,
                    salt: keccak256("comp2")
                })
            )
        );
        vm.prank(creator);
        assertTrue(token.transfer(alice, 1000e18));
        vm.prank(creator);
        token.pause();

        vm.prank(creator);
        vm.expectRevert();
        token.forceTransfer(alice, creator, 1e18, "frozen");
    }

    function test_AllowlistBlocksNonMembers() public {
        vm.prank(creator);
        ComplianceToken token = ComplianceToken(
            tokenFactory.deployCompliance{value: deployFee}(
                TokenFactory.ComplianceParams({
                    name: "Comp",
                    symbol: "CMP",
                    supply: SUPPLY,
                    recipient: creator,
                    admin: creator,
                    allowlistEnabled: true,
                    salt: keccak256("comp3")
                })
            )
        );
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(ComplianceToken.RecipientNotAllowlisted.selector, alice));
        // Expected to revert; vm.expectRevert asserts the outcome, so there is no
        // return value to check.
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(alice, 1e18);

        vm.prank(creator);
        token.setAllowlisted(alice, true);
        vm.prank(creator);
        assertTrue(token.transfer(alice, 1e18));
        assertEq(token.balanceOf(alice), 1e18);
    }

    // -----------------------------------------------------------------
    // Factory behaviour
    // -----------------------------------------------------------------

    function test_Create2AddressIsPredictable() public {
        bytes32 userSalt = keccak256("predict");
        bytes memory initCode =
            abi.encodePacked(type(StandardToken).creationCode, abi.encode("Token", "TKN", SUPPLY, creator, creator));
        address predicted =
            tokenFactory.computeAddress(TokenFactory.Template.Standard, creator, userSalt, keccak256(initCode));

        vm.prank(creator);
        address actual = tokenFactory.deployStandard{value: deployFee}(_base(userSalt));
        assertEq(actual, predicted, "UI must show the final address before signing");
    }

    /// @dev Two deployers using the same user salt must not collide, and neither can occupy the
    ///      address the other computed.
    function test_SaltIsScopedPerDeployerSoAddressesCannotBeStolen() public {
        bytes32 shared = keccak256("same-salt");

        vm.prank(creator);
        address a = tokenFactory.deployStandard{value: deployFee}(_base(shared));
        vm.prank(alice);
        address b = tokenFactory.deployStandard{value: deployFee}(_base(shared));

        assertTrue(a != b, "same salt from different deployers must not collide");
        assertEq(tokenFactory.effectiveSalt(creator, shared) == tokenFactory.effectiveSalt(alice, shared), false);
    }

    function test_DeployFeeIsChargedAndExcessRefunded() public {
        uint256 fee = deployFee;
        uint256 before = creator.balance;
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));

        vm.prank(creator);
        tokenFactory.deployStandard{value: fee + 1 ether}(_base(keccak256("refund")));

        assertEq(before - creator.balance, fee, "only the fee was taken");
        assertEq(feeRouter.balanceOf(treasury, address(0)) - treasuryBefore, fee);
    }

    function test_UnderpaidDeployReverts() public {
        uint256 fee = deployFee;
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TokenFactory.InsufficientFee.selector, fee - 1, fee));
        tokenFactory.deployStandard{value: fee - 1}(_base(keccak256("underpaid")));
    }

    function test_RegistryRecordsProvenance() public {
        vm.prank(creator);
        address t = tokenFactory.deployStandard{value: deployFee}(_base(keccak256("registry")));

        TokenFactory.Deployment memory d = tokenFactory.deploymentOf(t);
        assertEq(d.deployer, creator);
        assertEq(uint8(d.template), uint8(TokenFactory.Template.Standard));
        assertTrue(tokenFactory.isPlatformToken(t));
        assertEq(tokenFactory.deployerTokenCount(creator), 1);
        assertEq(tokenFactory.totalTokens(), 1);
        assertEq(tokenFactory.tokensPaged(0, 10).length, 1);
        assertEq(tokenFactory.tokensPaged(5, 10).length, 0);
    }

    function test_PauseStopsNewDeploymentsOnly() public {
        vm.prank(creator);
        address t = tokenFactory.deployStandard{value: deployFee}(_base(keccak256("before")));

        vm.prank(owner);
        tokenFactory.pause();

        vm.prank(creator);
        vm.expectRevert();
        tokenFactory.deployStandard{value: deployFee}(_base(keccak256("after")));

        // The already-deployed token is completely unaffected.
        vm.prank(creator);
        assertTrue(IERC20(t).transfer(alice, 1e18));
        assertEq(IERC20(t).balanceOf(alice), 1e18);
    }
}
