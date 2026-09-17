// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title ComplianceToken
/// @notice Permissioned ERC-20 for regulated issuers: allowlist, blocklist, pause and clawback.
///
/// @dev THIS TOKEN IS CUSTODIAL IN EFFECT. A custodian can seize any holder's balance with
///      `forceTransfer`, and an admin can freeze all transfers. It is included because real
///      securities and stablecoin issuers are legally required to hold these powers - not
///      because they are safe for a retail holder.
///
///      The platform treats this template as maximum-disclosure: `riskFlags()` reports
///      CLAWBACK | BLOCKLIST | PAUSABLE | OWNED unconditionally (plus ALLOWLIST when
///      transfer-allowlisting is on), it is permanently barred from bonding-curve mode, and the
///      UI gates it behind an explicit acknowledgement naming the seizure power.
contract ComplianceToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, AccessControl, IPlatformToken {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public immutable deployer;

    /// @notice When true, both parties to a transfer must be allowlisted.
    bool public allowlistEnabled;

    mapping(address => bool) public isAllowlisted;
    mapping(address => bool) public isBlocked;

    event AllowlistEnabledUpdated(bool enabled);
    event AllowlistUpdated(address indexed account, bool allowed);
    event BlocklistUpdated(address indexed account, bool blocked);
    event ForcedTransfer(address indexed from, address indexed to, uint256 value, string reason);

    error ZeroAddress();
    error ZeroSupply();
    error SenderBlocked(address account);
    error RecipientBlocked(address account);
    error SenderNotAllowlisted(address account);
    error RecipientNotAllowlisted(address account);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 supply,
        address recipient,
        address admin,
        bool allowlistEnabled_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (recipient == address(0) || admin == address(0)) revert ZeroAddress();
        if (supply == 0) revert ZeroSupply();
        deployer = msg.sender;
        allowlistEnabled = allowlistEnabled_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
        _grantRole(CUSTODIAN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        isAllowlisted[admin] = true;
        isAllowlisted[recipient] = true;
        _mint(recipient, supply);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setAllowlistEnabled(bool enabled) external onlyRole(COMPLIANCE_ROLE) {
        allowlistEnabled = enabled;
        emit AllowlistEnabledUpdated(enabled);
    }

    function setAllowlisted(address account, bool allowed) external onlyRole(COMPLIANCE_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        isAllowlisted[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }

    function setAllowlistedBatch(address[] calldata accounts, bool allowed)
        external
        onlyRole(COMPLIANCE_ROLE)
    {
        for (uint256 i; i < accounts.length; ++i) {
            if (accounts[i] == address(0)) revert ZeroAddress();
            isAllowlisted[accounts[i]] = allowed;
            emit AllowlistUpdated(accounts[i], allowed);
        }
    }

    function setBlocked(address account, bool blocked) external onlyRole(COMPLIANCE_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        isBlocked[account] = blocked;
        emit BlocklistUpdated(account, blocked);
    }

    /// @notice Seize `value` from `from`. Bypasses blocklist and allowlist checks by design, so a
    ///         sanctioned or frozen balance can still be recovered to a controlled address.
    /// @param reason Recorded on-chain so every seizure carries a stated justification.
    function forceTransfer(address from, address to, uint256 value, string calldata reason)
        external
        onlyRole(CUSTODIAN_ROLE)
    {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        // Call ERC20's _update directly to skip the compliance gate, but keep the pause gate:
        // a frozen token must not move even for a custodian.
        _requireNotPaused();
        ERC20._update(from, to, value);
        emit ForcedTransfer(from, to, value, reason);
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.compliance.v1");
    }

    /// @inheritdoc IPlatformToken
    /// @dev Reported unconditionally. These powers are structural to this template; unlike the
    ///      other templates there is no renouncement path, because an issuer bound by law to
    ///      hold them must not be able to accidentally give them up.
    function riskFlags() external view returns (uint256) {
        uint256 flags =
            RiskFlags.CLAWBACK | RiskFlags.BLOCKLIST | RiskFlags.PAUSABLE | RiskFlags.MINTABLE | RiskFlags.OWNED;
        if (allowlistEnabled) flags |= RiskFlags.ALLOWLIST;
        return flags;
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        // Mint (from == 0) and burn (to == 0) legs skip the counterparty check for the zero address.
        if (from != address(0)) {
            if (isBlocked[from]) revert SenderBlocked(from);
            if (allowlistEnabled && !isAllowlisted[from]) revert SenderNotAllowlisted(from);
        }
        if (to != address(0)) {
            if (isBlocked[to]) revert RecipientBlocked(to);
            if (allowlistEnabled && !isAllowlisted[to]) revert RecipientNotAllowlisted(to);
        }
        super._update(from, to, value);
    }
}
