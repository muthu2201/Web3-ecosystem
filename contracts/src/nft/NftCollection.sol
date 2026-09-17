// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title NftCollection
/// @notice ERC-721 collection with phased public and allowlist minting.
///
/// @dev HONEST ROYALTIES. This contract implements ERC-2981, and that is all ERC-2981 can do:
///      it publishes a number. Since OpenSea retired the Operator Filter in August 2023,
///      no marketplace is obliged to honour it, and most no longer do by default. The platform
///      tells creators this plainly rather than selling enforcement it cannot deliver. The
///      royalty is capped at 10% so a collection cannot publish a figure that makes its own
///      secondary market unusable on the venues that do honour it.
///
/// @dev METADATA CAN BE FROZEN. `freezeMetadata` permanently locks the base URI, which is the
///      strongest promise an NFT collection can make: after a reveal, the art can never be
///      swapped out. Until it is called, `metadataFrozen()` reports false and the UI says so.
contract NftCollection is ERC721, ERC2981, Ownable2Step, ReentrancyGuard {
    using Strings for uint256;

    /// @dev Ceiling on secondary royalties, in basis points.
    uint96 public constant MAX_ROYALTY_BPS = 1000; // 10%

    struct Phase {
        bytes32 merkleRoot; // zero for a public phase
        uint256 price;
        uint64 startsAt;
        uint64 endsAt;
        uint32 maxPerWallet;
        uint32 maxSupply; // cumulative supply ceiling for this phase, 0 = collection max
    }

    IFeeRouter public immutable feeRouter;

    /// @notice Hard supply ceiling, fixed at deployment.
    uint256 public immutable maxSupply;

    address public immutable deployer;

    uint256 public totalMinted;
    uint256 private _nextTokenId = 1;

    string private _baseTokenURI;
    string private _contractURI;
    bool public metadataFrozen;

    Phase[] private _phases;

    /// @notice Native proceeds owed to the owner, withdrawn by pull.
    uint256 public proceeds;

    mapping(uint256 phaseId => mapping(address minter => uint256 count)) public mintedInPhase;

    event PhaseAdded(uint256 indexed phaseId, Phase phase);
    event PhaseUpdated(uint256 indexed phaseId, Phase phase);
    event Minted(address indexed to, uint256 indexed phaseId, uint256 quantity, uint256 pricePaid, uint256 fee);
    event MetadataFrozen(string baseURI);
    event BaseURIUpdated(string baseURI);
    event ContractURIUpdated(string contractURI);
    event ProceedsWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroQuantity();
    error MaxSupplyExceeded(uint256 requested, uint256 remaining);
    error UnknownPhase(uint256 phaseId);
    error PhaseNotActive(uint64 startsAt, uint64 endsAt);
    error PhaseSupplyExceeded(uint256 requested, uint256 remaining);
    error WalletLimitExceeded(uint256 attempted, uint256 limit);
    error NotAllowlisted();
    error IncorrectPayment(uint256 sent, uint256 required);
    error MetadataIsFrozen();
    error RoyaltyTooHigh(uint96 bps, uint96 cap);
    error NothingToWithdraw();
    error NativeTransferFailed();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractURI_,
        uint256 maxSupply_,
        address owner_,
        address royaltyReceiver,
        uint96 royaltyBps,
        IFeeRouter feeRouter_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (owner_ == address(0) || royaltyReceiver == address(0)) revert ZeroAddress();
        if (maxSupply_ == 0) revert ZeroQuantity();
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(royaltyBps, MAX_ROYALTY_BPS);

        deployer = msg.sender;
        maxSupply = maxSupply_;
        feeRouter = feeRouter_;
        _baseTokenURI = baseURI_;
        _contractURI = contractURI_;
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    // ---------------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------------

    /// @notice Mint `quantity` tokens from `phaseId`.
    /// @param proof Merkle proof of allowlist membership; ignored for a public phase.
    function mint(uint256 phaseId, uint256 quantity, bytes32[] calldata proof)
        external
        payable
        nonReentrant
        returns (uint256 firstTokenId)
    {
        if (quantity == 0) revert ZeroQuantity();
        if (phaseId >= _phases.length) revert UnknownPhase(phaseId);
        Phase memory phase = _phases[phaseId];

        if (block.timestamp < phase.startsAt || block.timestamp >= phase.endsAt) {
            revert PhaseNotActive(phase.startsAt, phase.endsAt);
        }

        uint256 remaining = maxSupply - totalMinted;
        if (quantity > remaining) revert MaxSupplyExceeded(quantity, remaining);

        if (phase.maxSupply != 0) {
            uint256 phaseRemaining = phase.maxSupply > totalMinted ? phase.maxSupply - totalMinted : 0;
            if (quantity > phaseRemaining) revert PhaseSupplyExceeded(quantity, phaseRemaining);
        }

        if (phase.maxPerWallet != 0) {
            uint256 already = mintedInPhase[phaseId][msg.sender] + quantity;
            if (already > phase.maxPerWallet) revert WalletLimitExceeded(already, phase.maxPerWallet);
        }

        if (phase.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
            if (!MerkleProof.verifyCalldata(proof, phase.merkleRoot, leaf)) revert NotAllowlisted();
        }

        uint256 cost = phase.price * quantity;
        if (msg.value != cost) revert IncorrectPayment(msg.value, cost);

        // Effects
        mintedInPhase[phaseId][msg.sender] += quantity;
        totalMinted += quantity;
        firstTokenId = _nextTokenId;
        _nextTokenId += quantity;

        uint256 fee;
        if (cost != 0) {
            fee = feeRouter.feeOn(IFeeRouter.Product.NftMint, cost);
            proceeds += cost - fee;
        }

        // Interactions. `_mint` is used rather than `_safeMint`: this function is `nonReentrant`,
        // and an ERC721Receiver callback here would let a contract minter re-enter the phase
        // accounting mid-loop. Contract recipients that need the callback can transfer in.
        for (uint256 i; i < quantity; ++i) {
            _mint(msg.sender, firstTokenId + i);
        }
        if (fee != 0) {
            feeRouter.routeNative{value: fee}(IFeeRouter.Product.NftMint, owner());
        }

        emit Minted(msg.sender, phaseId, quantity, cost, fee);
    }

    /// @notice Withdraw accumulated mint proceeds.
    function withdrawProceeds(address to) external nonReentrant onlyOwner returns (uint256 amount) {
        if (to == address(0)) revert ZeroAddress();
        amount = proceeds;
        if (amount == 0) revert NothingToWithdraw();
        proceeds = 0; // effects before interaction
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
        emit ProceedsWithdrawn(to, amount);
    }

    // ---------------------------------------------------------------------
    // Phases
    // ---------------------------------------------------------------------

    function addPhase(Phase calldata phase) external onlyOwner returns (uint256 phaseId) {
        phaseId = _phases.length;
        _phases.push(phase);
        emit PhaseAdded(phaseId, phase);
    }

    /// @notice Update a phase that has not started yet.
    /// @dev A live or finished phase is immutable, so nobody can have the price or allowlist
    ///      changed underneath them after they have committed to minting in it.
    function updatePhase(uint256 phaseId, Phase calldata phase) external onlyOwner {
        if (phaseId >= _phases.length) revert UnknownPhase(phaseId);
        Phase memory existing = _phases[phaseId];
        if (block.timestamp >= existing.startsAt) revert PhaseNotActive(existing.startsAt, existing.endsAt);
        _phases[phaseId] = phase;
        emit PhaseUpdated(phaseId, phase);
    }

    function phaseCount() external view returns (uint256) {
        return _phases.length;
    }

    function getPhase(uint256 phaseId) external view returns (Phase memory) {
        if (phaseId >= _phases.length) revert UnknownPhase(phaseId);
        return _phases[phaseId];
    }

    // ---------------------------------------------------------------------
    // Metadata
    // ---------------------------------------------------------------------

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return bytes(_baseTokenURI).length == 0 ? "" : string.concat(_baseTokenURI, tokenId.toString());
    }

    /// @notice ERC-7572 collection-level metadata.
    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setContractURI(string calldata newContractURI) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    /// @notice Permanently lock the metadata. Cannot be undone.
    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;
        emit MetadataFrozen(_baseTokenURI);
    }

    // ---------------------------------------------------------------------
    // Royalties
    // ---------------------------------------------------------------------

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        if (bps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(bps, MAX_ROYALTY_BPS);
        _setDefaultRoyalty(receiver, bps);
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 bps) external onlyOwner {
        if (bps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(bps, MAX_ROYALTY_BPS);
        _setTokenRoyalty(tokenId, receiver, bps);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @dev No `receive`: native currency only enters through `mint`, which accounts for it.
}
