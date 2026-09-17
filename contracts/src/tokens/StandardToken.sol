// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title StandardToken
/// @notice Fixed-supply, ownerless ERC-20. The only template permitted in bonding-curve mode.
///
/// @dev This contract has no owner, no admin role, no mint path after construction, no transfer
///      tax, no pause, no blocklist and no clawback. Those are not configuration choices that
///      happen to be switched off - the code to perform them does not exist, so no future
///      transaction can introduce them. The contract is non-upgradeable.
///
///      That is the whole point: because every degen-mode launch deploys byte-identical logic,
///      a buyer can verify one template once instead of auditing every new token.
///
///      Total supply is minted to `recipient` in the constructor and can only ever decrease,
///      via `burn`/`burnFrom` called by a holder on their own balance or allowance.
contract StandardToken is ERC20, ERC20Burnable, ERC20Permit, IPlatformToken {
    /// @notice Address that deployed this token through the platform factory.
    address public immutable deployer;

    /// @notice Supply minted at construction. `totalSupply()` can only fall below this via burns.
    uint256 public immutable initialSupply;

    error ZeroAddress();
    error ZeroSupply();

    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    /// @param supply Full supply, minted once to `recipient`.
    /// @param recipient Receives the entire supply.
    /// @param deployer_ Account credited as the launcher, recorded for provenance only.
    constructor(string memory name_, string memory symbol_, uint256 supply, address recipient, address deployer_)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        if (recipient == address(0) || deployer_ == address(0)) revert ZeroAddress();
        if (supply == 0) revert ZeroSupply();
        deployer = deployer_;
        initialSupply = supply;
        _mint(recipient, supply);
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.standard.v1");
    }

    /// @inheritdoc IPlatformToken
    /// @dev Always `NONE`. There is no state this contract could enter that grants a privilege.
    function riskFlags() external pure returns (uint256) {
        return RiskFlags.NONE;
    }
}
