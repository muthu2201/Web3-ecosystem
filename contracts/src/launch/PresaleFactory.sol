// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {Presale} from "./Presale.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LibClone} from "solady/utils/LibClone.sol";

/// @title PresaleFactory
/// @notice Creates presales and fair launches, funding each one before it can open.
///
/// @dev Creation is atomic: the clone is deployed, the creator's tokens are pulled straight into
///      it, and it is initialised, all in one transaction. A half-created sale that is advertised
///      but cannot pay out is therefore not a reachable state.
contract PresaleFactory is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public presaleImplementation;
    IFeeRouter public immutable feeRouter;

    mapping(address presale => bool) public isPresale;
    mapping(address token => address[] presales) private _presalesOfToken;
    address[] private _allPresales;

    event PresaleCreated(
        address indexed presale,
        address indexed token,
        address indexed owner,
        uint256 tokensFunded,
        bool isFairLaunch
    );
    event PresaleImplementationSet(address indexed implementation);

    error ZeroAddress();
    error ImplementationAlreadySet();
    error ImplementationNotSet();
    error TokenFundingMismatch(uint256 received, uint256 required);

    constructor(address initialOwner, IFeeRouter feeRouter_) Ownable(initialOwner) {
        if (address(feeRouter_) == address(0)) revert ZeroAddress();
        feeRouter = feeRouter_;
    }

    /// @notice Bind the presale implementation. Callable once, then frozen forever.
    /// @dev Same reasoning as the curve factory: a mutable implementation pointer would let a
    ///      future owner change the code every later sale runs on.
    function setPresaleImplementation(address implementation) external onlyOwner {
        if (implementation == address(0)) revert ZeroAddress();
        if (presaleImplementation != address(0)) revert ImplementationAlreadySet();
        presaleImplementation = implementation;
        emit PresaleImplementationSet(implementation);
    }

    /// @notice Deploy, fund and open a presale in one transaction.
    /// @param p Sale parameters. `owner` is forced to the caller so a sale cannot be created on
    ///          someone else's behalf and pointed at an attacker's payout address.
    /// @param salt Caller-scoped CREATE2 salt.
    function createPresale(Presale.Params calldata p, bytes32 salt)
        external
        whenNotPaused
        nonReentrant
        returns (address presale)
    {
        if (presaleImplementation == address(0)) revert ImplementationNotSet();
        if (p.token == address(0)) revert ZeroAddress();

        presale = LibClone.cloneDeterministic(
            presaleImplementation, keccak256(abi.encode(msg.sender, salt))
        );

        // Fund the clone directly from the creator. Credit what actually arrived, so a
        // fee-on-transfer sale token cannot open a sale it is unable to settle.
        uint256 required = Presale(payable(presale)).tokensNeeded(p);
        uint256 before = IERC20(p.token).balanceOf(presale);
        IERC20(p.token).safeTransferFrom(msg.sender, presale, required);
        uint256 received = IERC20(p.token).balanceOf(presale) - before;
        if (received < required) revert TokenFundingMismatch(received, required);

        Presale.Params memory params = p;
        params.owner = msg.sender;
        Presale(payable(presale)).initialize(params);

        isPresale[presale] = true;
        _presalesOfToken[p.token].push(presale);
        _allPresales.push(presale);

        emit PresaleCreated(presale, p.token, msg.sender, received, p.isFairLaunch);
    }

    /// @notice Tokens the caller must approve before `createPresale` will succeed.
    function tokensNeeded(Presale.Params calldata p) external view returns (uint256) {
        if (presaleImplementation == address(0)) revert ImplementationNotSet();
        return Presale(payable(presaleImplementation)).tokensNeeded(p);
    }

    function predictPresaleAddress(address creator, bytes32 salt) external view returns (address) {
        return LibClone.predictDeterministicAddress(
            presaleImplementation, keccak256(abi.encode(creator, salt)), address(this)
        );
    }

    function totalPresales() external view returns (uint256) {
        return _allPresales.length;
    }

    function presalesPaged(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 len = _allPresales.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new address[](end - offset);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _allPresales[offset + i];
        }
    }

    function presalesOfToken(address token) external view returns (address[] memory) {
        return _presalesOfToken[token];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
