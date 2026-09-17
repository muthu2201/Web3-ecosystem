// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {ComplianceToken} from "./ComplianceToken.sol";
import {GovernanceToken} from "./GovernanceToken.sol";
import {MintableToken} from "./MintableToken.sol";
import {PausableToken} from "./PausableToken.sol";
import {StandardToken} from "./StandardToken.sol";
import {TaxToken} from "./TaxToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenFactory
/// @notice Deploys the audited token templates at deterministic addresses and records provenance.
///
/// @dev DESIGN NOTE - why full deployments instead of EIP-1167 clones.
///      Clones are cheaper, but a cloned token shows up on block explorers as an opaque proxy,
///      is awkward to verify, and is routinely penalised by aggregators and risk scanners. For a
///      token, whose entire value proposition is that a stranger can verify it in one click, the
///      gas saving is not worth the trust cost. Each token here is a real, independently
///      verifiable, non-upgradeable contract. Clones are used elsewhere in the system (curves,
///      presales, locks) where the deployed contract is platform infrastructure rather than the
///      asset a user is asked to trust.
///
/// @dev SALT DOMAIN SEPARATION. The CREATE2 salt is `keccak256(msg.sender, userSalt)`, not
///      `userSalt`. Without this, anyone watching the mempool could take an address another user
///      had computed and deploy different bytecode there first. Mixing the caller in makes each
///      deployer's address space disjoint while keeping addresses reproducible across chains for
///      the same (deployer, salt) pair.
contract TokenFactory is Ownable2Step, Pausable, ReentrancyGuard {
    /// @notice Audited templates this factory can deploy. Append only, never reorder.
    enum Template {
        Standard,
        Mintable,
        Pausable_,
        Governance,
        Tax,
        Compliance
    }

    struct Deployment {
        address deployer;
        uint64 deployedAt;
        Template template;
    }

    /// @notice Fee router that receives the flat deployment fee.
    IFeeRouter public immutable feeRouter;

    mapping(address token => Deployment) private _deploymentOf;
    mapping(address deployer => address[] tokens) private _tokensByDeployer;
    address[] private _allTokens;

    event TokenDeployed(
        address indexed token,
        address indexed deployer,
        Template indexed template,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 feePaid
    );

    error InsufficientFee(uint256 provided, uint256 required);
    error RefundFailed();
    error ZeroAddress();
    error UnknownToken(address token);

    constructor(address initialOwner, IFeeRouter feeRouter_) Ownable(initialOwner) {
        if (address(feeRouter_) == address(0)) revert ZeroAddress();
        feeRouter = feeRouter_;
    }

    // ---------------------------------------------------------------------
    // Parameter structs (kept separate to stay well clear of stack limits)
    // ---------------------------------------------------------------------

    struct BaseParams {
        string name;
        string symbol;
        uint256 supply;
        address recipient;
        bytes32 salt;
    }

    struct CappedParams {
        string name;
        string symbol;
        uint256 cap;
        uint256 initialSupply;
        address recipient;
        address admin;
        bytes32 salt;
    }

    struct TaxParams {
        string name;
        string symbol;
        uint256 supply;
        address recipient;
        address owner;
        address taxRecipient;
        uint16 maxTaxBps;
        uint16 buyTaxBps;
        uint16 sellTaxBps;
        bytes32 salt;
    }

    struct ComplianceParams {
        string name;
        string symbol;
        uint256 supply;
        address recipient;
        address admin;
        bool allowlistEnabled;
        bytes32 salt;
    }

    // ---------------------------------------------------------------------
    // Deployments
    // ---------------------------------------------------------------------

    /// @notice Deploy a fixed-supply, ownerless token. The only template valid for bonding curves.
    function deployStandard(BaseParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = _collectFee();
        token = address(new StandardToken{salt: _salt(p.salt)}(p.name, p.symbol, p.supply, p.recipient, msg.sender));
        _register(token, Template.Standard, p.name, p.symbol, p.supply, fee);
    }

    /// @notice Deploy a capped, role-gated mintable token.
    function deployMintable(CappedParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = _collectFee();
        token = address(
            new MintableToken{salt: _salt(p.salt)}(p.name, p.symbol, p.cap, p.initialSupply, p.recipient, p.admin)
        );
        _register(token, Template.Mintable, p.name, p.symbol, p.initialSupply, fee);
    }

    /// @notice Deploy a fixed-supply token whose transfers can be paused by a role.
    function deployPausable(BaseParams calldata p, address admin)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = _collectFee();
        token = address(new PausableToken{salt: _salt(p.salt)}(p.name, p.symbol, p.supply, p.recipient, admin));
        _register(token, Template.Pausable_, p.name, p.symbol, p.supply, fee);
    }

    /// @notice Deploy a capped token with checkpointed voting power.
    function deployGovernance(CappedParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = _collectFee();
        token = address(
            new GovernanceToken{salt: _salt(p.salt)}(p.name, p.symbol, p.cap, p.initialSupply, p.recipient, p.admin)
        );
        _register(token, Template.Governance, p.name, p.symbol, p.initialSupply, fee);
    }

    /// @notice Deploy a token with a monotonically non-increasing buy/sell tax.
    /// @dev Limited routability: pair only into v2-style pools. See `TaxToken`.
    function deployTax(TaxParams calldata p) external payable whenNotPaused nonReentrant returns (address token) {
        uint256 fee = _collectFee();
        token = address(
            new TaxToken{salt: _salt(p.salt)}(
                p.name,
                p.symbol,
                p.supply,
                p.recipient,
                p.owner,
                p.taxRecipient,
                p.maxTaxBps,
                p.buyTaxBps,
                p.sellTaxBps
            )
        );
        _register(token, Template.Tax, p.name, p.symbol, p.supply, fee);
    }

    /// @notice Deploy a permissioned token with clawback, blocklist, allowlist and pause.
    /// @dev Maximum-disclosure template. Never valid for bonding-curve mode.
    function deployCompliance(ComplianceParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = _collectFee();
        token = address(
            new ComplianceToken{salt: _salt(p.salt)}(
                p.name, p.symbol, p.supply, p.recipient, p.admin, p.allowlistEnabled
            )
        );
        _register(token, Template.Compliance, p.name, p.symbol, p.supply, fee);
    }

    // ---------------------------------------------------------------------
    // Address prediction
    // ---------------------------------------------------------------------

    /// @notice Salt actually used by CREATE2 for `deployer` and their chosen `userSalt`.
    function effectiveSalt(address deployer, bytes32 userSalt) public pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }

    /// @notice Address a deployment would land on.
    /// @param initCodeHash keccak256(creationCode ++ abi.encode(constructorArgs)) for the template.
    /// @dev The SDK derives `initCodeHash` from the compiled artifact, so the UI can show the
    ///      final token address before the user signs, and prove the same address is reachable on
    ///      every EVM chain with identical CREATE2 semantics.
    function computeAddress(address deployer, bytes32 userSalt, bytes32 initCodeHash) public view returns (address) {
        bytes32 salt = effectiveSalt(deployer, userSalt);
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)))));
    }

    // ---------------------------------------------------------------------
    // Registry views
    // ---------------------------------------------------------------------

    function deploymentOf(address token) external view returns (Deployment memory) {
        Deployment memory d = _deploymentOf[token];
        if (d.deployer == address(0)) revert UnknownToken(token);
        return d;
    }

    function isPlatformToken(address token) external view returns (bool) {
        return _deploymentOf[token].deployer != address(0);
    }

    function totalTokens() external view returns (uint256) {
        return _allTokens.length;
    }

    /// @notice Paginated token list. Bounded so a UI can page without risking an unbounded read.
    function tokensPaged(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 len = _allTokens.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _allTokens[offset + i];
        }
    }

    function tokensByDeployer(address deployer) external view returns (address[] memory) {
        return _tokensByDeployer[deployer];
    }

    function deployerTokenCount(address deployer) external view returns (uint256) {
        return _tokensByDeployer[deployer].length;
    }

    // ---------------------------------------------------------------------
    // Admin - can only stop new deployments, never touch a deployed token
    // ---------------------------------------------------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _salt(bytes32 userSalt) private view returns (bytes32) {
        return effectiveSalt(msg.sender, userSalt);
    }

    /// @dev Takes the flat deployment fee and refunds any excess. Reads the fee once, so a
    ///      concurrent fee change cannot cause the charged amount and the refunded amount to
    ///      disagree. Called before any external template constructor runs, and the whole
    ///      deployment path is `nonReentrant`.
    function _collectFee() private returns (uint256 fee) {
        fee = feeRouter.flatNativeOf(IFeeRouter.Product.TokenDeploy);
        if (msg.value < fee) revert InsufficientFee(msg.value, fee);
        if (fee != 0) {
            feeRouter.routeNative{value: fee}(IFeeRouter.Product.TokenDeploy, address(0));
        }
        uint256 refund = msg.value - fee;
        if (refund != 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }
    }

    function _register(
        address token,
        Template template,
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        uint256 feePaid
    ) private {
        _deploymentOf[token] = Deployment({
            deployer: msg.sender, deployedAt: uint64(block.timestamp), template: template
        });
        _tokensByDeployer[msg.sender].push(token);
        _allTokens.push(token);
        emit TokenDeployed(token, msg.sender, template, name, symbol, initialSupply, feePaid);
    }
}
