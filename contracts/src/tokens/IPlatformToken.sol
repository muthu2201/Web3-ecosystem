// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Bitmask of administrative powers a token grants its deployer.
/// @dev Every template self-declares its powers on-chain so wallets, aggregators and the
///      platform's own listing pages can render an honest risk badge without trusting an
///      off-chain database or re-deriving behaviour from bytecode.
library RiskFlags {
    uint256 internal constant NONE = 0;
    uint256 internal constant MINTABLE = 1 << 0;
    uint256 internal constant PAUSABLE = 1 << 1;
    uint256 internal constant TAXED = 1 << 2;
    uint256 internal constant BLOCKLIST = 1 << 3;
    uint256 internal constant ALLOWLIST = 1 << 4;
    uint256 internal constant CLAWBACK = 1 << 5;
    uint256 internal constant UPGRADEABLE = 1 << 6;
    uint256 internal constant OWNED = 1 << 7;
    uint256 internal constant CAPPED = 1 << 8;
    uint256 internal constant VOTES = 1 << 9;
}

/// @title IPlatformToken
/// @notice Common surface every token template deployed by the factory implements.
interface IPlatformToken {
    /// @notice Stable identifier of the audited template this contract was compiled from.
    function templateId() external pure returns (bytes32);

    /// @notice Administrative powers currently live on this token, as a `RiskFlags` bitmask.
    /// @dev Reflects live state: a template whose owner has renounced clears `OWNED` and every
    ///      power that depends on it, so a UI reading this after renouncement shows the truth.
    function riskFlags() external view returns (uint256);
}
