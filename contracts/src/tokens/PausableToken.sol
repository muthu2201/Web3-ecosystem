// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title PausableToken
/// @notice Fixed-supply ERC-20 whose transfers can be halted by a pauser role.
///
/// @dev Pausing is a genuine freeze power: while paused, holders cannot sell. It exists for
///      projects that need an incident switch, and it is surfaced loudly by `riskFlags()`.
///      `renouncePauseForever` lets a project permanently give the power up, which is the
///      strongest trust signal a pausable token can emit.
contract PausableToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, AccessControl, IPlatformToken {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    address public immutable deployer;
    uint256 public immutable initialSupply;

    /// @notice Once true, the token can never be paused again and is unpaused permanently.
    bool public pauseRenounced;

    event PauseRenouncedForever();

    error ZeroAddress();
    error ZeroSupply();
    error PauseAlreadyRenounced();

    constructor(string memory name_, string memory symbol_, uint256 supply, address recipient, address admin)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        if (recipient == address(0) || admin == address(0)) revert ZeroAddress();
        if (supply == 0) revert ZeroSupply();
        deployer = msg.sender;
        initialSupply = supply;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _mint(recipient, supply);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        if (pauseRenounced) revert PauseAlreadyRenounced();
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Permanently surrender the ability to pause. Unpauses first so the token can never
    ///         be left frozen. Cannot be undone.
    function renouncePauseForever() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pauseRenounced) revert PauseAlreadyRenounced();
        pauseRenounced = true;
        if (paused()) _unpause();
        emit PauseRenouncedForever();
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.pausable.v1");
    }

    /// @inheritdoc IPlatformToken
    function riskFlags() external view returns (uint256) {
        if (pauseRenounced) return RiskFlags.NONE;
        return RiskFlags.PAUSABLE | RiskFlags.OWNED;
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
