// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title GovernanceToken
/// @notice Capped ERC-20 with checkpointed voting power, for DAO-governed projects.
///
/// @dev Uses timestamp-based checkpoints (`CLOCK_MODE=timestamp`) rather than block numbers,
///      so voting windows behave identically across L2s with differing block times - a real
///      correctness issue on Base and BNB Chain, where block-number clocks drift against
///      wall-clock governance schedules.
contract GovernanceToken is
    ERC20,
    ERC20Burnable,
    ERC20Capped,
    ERC20Permit,
    ERC20Votes,
    AccessControl,
    IPlatformToken
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public immutable deployer;
    bool public mintingSealed;

    event MintingSealed();

    error ZeroAddress();
    error ZeroSupply();
    error MintingIsSealed();
    error InitialSupplyAboveCap();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 cap_,
        uint256 initialSupply,
        address recipient,
        address admin
    ) ERC20(name_, symbol_) ERC20Capped(cap_) ERC20Permit(name_) {
        if (recipient == address(0) || admin == address(0)) revert ZeroAddress();
        if (initialSupply == 0) revert ZeroSupply();
        if (initialSupply > cap_) revert InitialSupplyAboveCap();
        deployer = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _mint(recipient, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (mintingSealed) revert MintingIsSealed();
        _mint(to, amount);
    }

    function sealMinting() external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintingSealed = true;
        emit MintingSealed();
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.governance.v1");
    }

    /// @inheritdoc IPlatformToken
    function riskFlags() external view returns (uint256) {
        uint256 flags = RiskFlags.CAPPED | RiskFlags.VOTES;
        if (!mintingSealed) flags |= RiskFlags.MINTABLE | RiskFlags.OWNED;
        return flags;
    }

    /// @dev Timestamp clock keeps governance periods consistent across chains with unstable
    ///      block times. See ERC-6372.
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
