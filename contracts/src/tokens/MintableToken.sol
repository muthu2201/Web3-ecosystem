// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title MintableToken
/// @notice Capped, role-gated mintable ERC-20 for funded projects with a published emission plan.
///
/// @dev The supply cap is immutable and enforced by `ERC20Capped` on every mint, so the maximum
///      dilution a holder can suffer is fixed at deployment and independently verifiable.
///      `MINTER_ROLE` is a real, disclosed admin power - `riskFlags()` reports `MINTABLE` for as
///      long as any account can still mint, and clears it once minting has been sealed.
contract MintableToken is ERC20, ERC20Burnable, ERC20Capped, ERC20Permit, AccessControl, IPlatformToken {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public immutable deployer;

    /// @notice Once true, no further tokens can ever be minted. One-way.
    bool public mintingSealed;

    event MintingSealed();

    error ZeroAddress();
    error ZeroSupply();
    error MintingIsSealed();
    error InitialSupplyAboveCap();

    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    /// @param cap_ Hard, immutable maximum supply.
    /// @param initialSupply Amount minted at construction to `recipient`.
    /// @param recipient Receives the initial supply.
    /// @param admin Holds `DEFAULT_ADMIN_ROLE` and `MINTER_ROLE`. Expected to be a multisig.
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

    /// @notice Mint up to the immutable cap.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (mintingSealed) revert MintingIsSealed();
        _mint(to, amount);
    }

    /// @notice Permanently disable minting. Cannot be undone.
    function sealMinting() external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintingSealed = true;
        emit MintingSealed();
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.mintable.v1");
    }

    /// @inheritdoc IPlatformToken
    function riskFlags() external view returns (uint256) {
        uint256 flags = RiskFlags.CAPPED;
        if (!mintingSealed) flags |= RiskFlags.MINTABLE | RiskFlags.OWNED;
        return flags;
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}
