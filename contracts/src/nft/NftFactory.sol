// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {NftCollection} from "./NftCollection.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NftFactory
/// @notice Deploys NFT collections at deterministic addresses and records provenance.
/// @dev Full deployments rather than clones, for the same reason as `TokenFactory`: a collection
///      a stranger is asked to mint from should be independently verifiable on a block explorer.
contract NftFactory is Ownable2Step, Pausable, ReentrancyGuard {
    struct Deployment {
        address deployer;
        uint64 deployedAt;
    }

    IFeeRouter public immutable feeRouter;

    mapping(address collection => Deployment) private _deploymentOf;
    mapping(address deployer => address[] collections) private _byDeployer;
    address[] private _allCollections;

    struct DeployParams {
        string name;
        string symbol;
        string baseURI;
        string contractURI;
        uint256 maxSupply;
        address owner;
        address royaltyReceiver;
        uint96 royaltyBps;
        bytes32 salt;
    }

    event CollectionDeployed(
        address indexed collection,
        address indexed deployer,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 feePaid
    );

    error InsufficientFee(uint256 provided, uint256 required);
    error RefundFailed();
    error ZeroAddress();
    error UnknownCollection(address collection);

    constructor(address initialOwner, IFeeRouter feeRouter_) Ownable(initialOwner) {
        if (address(feeRouter_) == address(0)) revert ZeroAddress();
        feeRouter = feeRouter_;
    }

    /// @notice Deploy a collection, paying the flat deployment fee.
    function deployCollection(DeployParams calldata p)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address collection)
    {
        uint256 fee = feeRouter.flatNativeOf(IFeeRouter.Product.NftDeploy);
        if (msg.value < fee) revert InsufficientFee(msg.value, fee);
        if (fee != 0) {
            feeRouter.routeNative{value: fee}(IFeeRouter.Product.NftDeploy, address(0));
        }

        // Salt is scoped to the caller, so deployers cannot collide or front-run one another.
        bytes32 salt = keccak256(abi.encode(msg.sender, p.salt));
        collection = address(
            new NftCollection{salt: salt}(
                p.name,
                p.symbol,
                p.baseURI,
                p.contractURI,
                p.maxSupply,
                p.owner == address(0) ? msg.sender : p.owner,
                p.royaltyReceiver == address(0) ? msg.sender : p.royaltyReceiver,
                p.royaltyBps,
                feeRouter
            )
        );

        _deploymentOf[collection] = Deployment({deployer: msg.sender, deployedAt: uint64(block.timestamp)});
        _byDeployer[msg.sender].push(collection);
        _allCollections.push(collection);

        uint256 refund = msg.value - fee;
        if (refund != 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }

        emit CollectionDeployed(collection, msg.sender, p.name, p.symbol, p.maxSupply, fee);
    }

    function effectiveSalt(address deployer, bytes32 userSalt) public pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }

    function computeAddress(address deployer, bytes32 userSalt, bytes32 initCodeHash)
        external
        view
        returns (address)
    {
        bytes32 salt = effectiveSalt(deployer, userSalt);
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)))));
    }

    function deploymentOf(address collection) external view returns (Deployment memory) {
        Deployment memory d = _deploymentOf[collection];
        if (d.deployer == address(0)) revert UnknownCollection(collection);
        return d;
    }

    function isPlatformCollection(address collection) external view returns (bool) {
        return _deploymentOf[collection].deployer != address(0);
    }

    function totalCollections() external view returns (uint256) {
        return _allCollections.length;
    }

    function collectionsPaged(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 len = _allCollections.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _allCollections[offset + i];
        }
    }

    function collectionsOfDeployer(address deployer) external view returns (address[] memory) {
        return _byDeployer[deployer];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
