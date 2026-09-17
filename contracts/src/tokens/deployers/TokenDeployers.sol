// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ComplianceToken} from "../ComplianceToken.sol";
import {GovernanceToken} from "../GovernanceToken.sol";
import {MintableToken} from "../MintableToken.sol";
import {PausableToken} from "../PausableToken.sol";
import {StandardToken} from "../StandardToken.sol";
import {TaxToken} from "../TaxToken.sol";

/// @title Token deployers
/// @notice One tiny contract per audited template, each holding only that template's creation code.
///
/// @dev WHY THIS EXISTS. `new StandardToken(...)` embeds the whole of StandardToken's creation
///      bytecode into whatever contract writes it. A single factory offering all six templates
///      therefore carried roughly 53 KB of embedded initcode and compiled to 59,318 bytes - more
///      than double the 24,576-byte EIP-170 limit, and undeployable on any real chain.
///
///      The unit tests did not catch it: Foundry raises the code-size limit inside tests, so a
///      contract that can never be deployed still passes every assertion. It surfaced the first
///      time the ecosystem was deployed to an actual node. `forge build --sizes` is now gated in
///      CI so this cannot regress.
///
/// @dev SECURITY. Each deployer is locked to the factory that owns it. Without that lock, anyone
///      could call a deployer directly with a salt a user had already computed and take the
///      address out from under them - the very front-running the factory's caller-scoped salt
///      exists to prevent. The factory is bound once, at construction of the deployer, and can
///      never be changed.
///
///      CREATE2 addresses derive from the deployer contract rather than the factory, so callers
///      predicting an address must use `TokenFactory.deployerFor(template)` as the CREATE2
///      origin. The factory exposes it for exactly that reason.
abstract contract BaseTokenDeployer {
    /// @notice The only contract permitted to call this deployer.
    address public immutable factory;

    error NotFactory();
    error ZeroAddress();

    constructor(address factory_) {
        if (factory_ == address(0)) revert ZeroAddress();
        factory = factory_;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }
}

contract StandardTokenDeployer is BaseTokenDeployer {
    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(
        bytes32 salt,
        string calldata name,
        string calldata symbol,
        uint256 supply,
        address recipient,
        address deployer
    ) external onlyFactory returns (address) {
        return address(new StandardToken{salt: salt}(name, symbol, supply, recipient, deployer));
    }
}

contract MintableTokenDeployer is BaseTokenDeployer {
    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(
        bytes32 salt,
        string calldata name,
        string calldata symbol,
        uint256 cap,
        uint256 initialSupply,
        address recipient,
        address admin
    ) external onlyFactory returns (address) {
        return address(new MintableToken{salt: salt}(name, symbol, cap, initialSupply, recipient, admin));
    }
}

contract PausableTokenDeployer is BaseTokenDeployer {
    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(
        bytes32 salt,
        string calldata name,
        string calldata symbol,
        uint256 supply,
        address recipient,
        address admin
    ) external onlyFactory returns (address) {
        return address(new PausableToken{salt: salt}(name, symbol, supply, recipient, admin));
    }
}

contract GovernanceTokenDeployer is BaseTokenDeployer {
    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(
        bytes32 salt,
        string calldata name,
        string calldata symbol,
        uint256 cap,
        uint256 initialSupply,
        address recipient,
        address admin
    ) external onlyFactory returns (address) {
        return address(new GovernanceToken{salt: salt}(name, symbol, cap, initialSupply, recipient, admin));
    }
}

contract TaxTokenDeployer is BaseTokenDeployer {
    struct Args {
        string name;
        string symbol;
        uint256 supply;
        address recipient;
        address owner;
        address taxRecipient;
        uint16 maxTaxBps;
        uint16 buyTaxBps;
        uint16 sellTaxBps;
    }

    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(bytes32 salt, Args calldata a) external onlyFactory returns (address) {
        return address(
            new TaxToken{salt: salt}(
                a.name,
                a.symbol,
                a.supply,
                a.recipient,
                a.owner,
                a.taxRecipient,
                a.maxTaxBps,
                a.buyTaxBps,
                a.sellTaxBps
            )
        );
    }
}

contract ComplianceTokenDeployer is BaseTokenDeployer {
    constructor(address factory_) BaseTokenDeployer(factory_) {}

    function deploy(
        bytes32 salt,
        string calldata name,
        string calldata symbol,
        uint256 supply,
        address recipient,
        address admin,
        bool allowlistEnabled
    ) external onlyFactory returns (address) {
        return address(new ComplianceToken{salt: salt}(name, symbol, supply, recipient, admin, allowlistEnabled));
    }
}
