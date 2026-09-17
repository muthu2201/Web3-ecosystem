// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../fees/IFeeRouter.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title NftMarketplace
/// @notice Off-chain order book, on-chain settlement. Orders are EIP-712 signatures, stored
///         wherever the platform likes (IPFS, edge KV, a relay to OpenSea) and never on-chain.
///
/// @dev NON-CUSTODIAL. The contract never holds an NFT or a balance between transactions. A
///      listing is a signature; the asset stays in the seller's wallet and the funds stay in the
///      buyer's until the instant they swap. Cancelling a listing costs nothing off-chain and is
///      enforceable on-chain through `cancelOrder` or a nonce bump.
///
/// @dev EIP-1271 SUPPORT. Signatures are verified with `SignatureChecker`, so smart-contract
///      wallets (Safe, ERC-4337 accounts) can list and bid. Restricting to `ecrecover` would
///      exclude a large and growing share of real users.
///
/// @dev ROYALTIES are read from ERC-2981 and capped at 10% of the sale price. A collection that
///      reports more than that has the excess ignored rather than the sale reverted, so a
///      misconfigured or hostile collection cannot brick its own secondary market - and cannot
///      quietly take a seller's entire proceeds either.
contract NftMarketplace is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Ceiling applied to whatever ERC-2981 reports.
    uint256 public constant MAX_ROYALTY_BPS = 1000; // 10%

    /// @notice A signed intent to trade one specific NFT.
    /// @param maker Signer. Seller for a listing, buyer for a bid.
    /// @param currency ERC-20 to settle in, or address(0) for native. Bids must use an ERC-20,
    ///        because native currency cannot be pre-authorised.
    /// @param isListing True if the maker is selling, false if the maker is bidding.
    struct Order {
        address maker;
        address collection;
        uint256 tokenId;
        address currency;
        uint256 price;
        uint64 startTime;
        uint64 endTime;
        uint256 nonce;
        bytes32 salt;
        bool isListing;
    }

    bytes32 private constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address collection,uint256 tokenId,address currency,uint256 price,uint64 startTime,uint64 endTime,uint256 nonce,bytes32 salt,bool isListing)"
    );

    IFeeRouter public immutable feeRouter;

    /// @notice Orders already filled or explicitly cancelled, by hash.
    mapping(bytes32 orderHash => bool) public cancelledOrFilled;

    /// @notice Every order from a maker with a nonce below this is void.
    mapping(address maker => uint256) public minNonce;

    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        address collection,
        uint256 tokenId,
        address currency,
        uint256 price,
        uint256 platformFee,
        uint256 royalty
    );
    event OrderCancelled(bytes32 indexed orderHash, address indexed maker);
    event NonceBumped(address indexed maker, uint256 newMinNonce);

    error InvalidSignature();
    error OrderNotStarted(uint64 startTime);
    error OrderExpired(uint64 endTime);
    error OrderAlreadyUsed(bytes32 orderHash);
    error NonceTooLow(uint256 nonce, uint256 minimum);
    error NotOrderMaker();
    error IncorrectPayment(uint256 sent, uint256 required);
    error NativeNotAllowedForBids();
    error UnexpectedNativeValue();
    error NativeTransferFailed();
    error ZeroPrice();
    error SelfTrade();

    constructor(IFeeRouter feeRouter_) EIP712("Web3EcosystemMarketplace", "1") {
        feeRouter = feeRouter_;
    }

    // ---------------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------------

    /// @notice Buy an NFT against a seller-signed listing.
    /// @dev The caller is the buyer. For a native-currency listing, `msg.value` must equal the
    ///      price exactly; for an ERC-20 listing, `msg.value` must be zero and the buyer must
    ///      have approved this contract.
    function fulfillListing(Order calldata order, bytes calldata signature) external payable nonReentrant {
        if (!order.isListing) revert InvalidSignature();
        bytes32 orderHash = _validate(order, signature);
        if (order.maker == msg.sender) revert SelfTrade();

        cancelledOrFilled[orderHash] = true; // effects before any interaction

        if (order.currency == address(0)) {
            if (msg.value != order.price) revert IncorrectPayment(msg.value, order.price);
        } else if (msg.value != 0) {
            revert UnexpectedNativeValue();
        }

        // Move the asset first. If the seller no longer owns it or has revoked approval, the
        // whole settlement reverts before any money changes hands.
        IERC721(order.collection).transferFrom(order.maker, msg.sender, order.tokenId);

        (uint256 platformFee, uint256 royalty, address royaltyReceiver) = _split(order);
        uint256 toSeller = order.price - platformFee - royalty;

        if (order.currency == address(0)) {
            if (platformFee != 0) {
                feeRouter.routeNative{value: platformFee}(IFeeRouter.Product.NftMarketplace, address(0));
            }
            if (royalty != 0) _sendNative(royaltyReceiver, royalty);
            if (toSeller != 0) _sendNative(order.maker, toSeller);
        } else {
            IERC20 currency = IERC20(order.currency);
            if (platformFee != 0) {
                currency.safeTransferFrom(msg.sender, address(this), platformFee);
                currency.forceApprove(address(feeRouter), platformFee);
                feeRouter.routeERC20(IFeeRouter.Product.NftMarketplace, order.currency, address(0), platformFee);
            }
            if (royalty != 0) currency.safeTransferFrom(msg.sender, royaltyReceiver, royalty);
            if (toSeller != 0) currency.safeTransferFrom(msg.sender, order.maker, toSeller);
        }

        emit OrderFilled(
            orderHash,
            order.maker,
            msg.sender,
            order.collection,
            order.tokenId,
            order.currency,
            order.price,
            platformFee,
            royalty
        );
    }

    /// @notice Accept a buyer-signed bid. The caller is the seller and must own the token.
    /// @dev Settled entirely in ERC-20, pulled from the bidder. Native bids are impossible
    ///      because there is no way to pre-authorise native currency without custody, and taking
    ///      custody is exactly what this contract refuses to do.
    function acceptBid(Order calldata order, bytes calldata signature) external nonReentrant {
        if (order.isListing) revert InvalidSignature();
        if (order.currency == address(0)) revert NativeNotAllowedForBids();
        bytes32 orderHash = _validate(order, signature);
        if (order.maker == msg.sender) revert SelfTrade();

        cancelledOrFilled[orderHash] = true;

        IERC721(order.collection).transferFrom(msg.sender, order.maker, order.tokenId);

        (uint256 platformFee, uint256 royalty, address royaltyReceiver) = _split(order);
        uint256 toSeller = order.price - platformFee - royalty;

        IERC20 currency = IERC20(order.currency);
        if (platformFee != 0) {
            currency.safeTransferFrom(order.maker, address(this), platformFee);
            currency.forceApprove(address(feeRouter), platformFee);
            feeRouter.routeERC20(IFeeRouter.Product.NftMarketplace, order.currency, address(0), platformFee);
        }
        if (royalty != 0) currency.safeTransferFrom(order.maker, royaltyReceiver, royalty);
        if (toSeller != 0) currency.safeTransferFrom(order.maker, msg.sender, toSeller);

        emit OrderFilled(
            orderHash,
            order.maker,
            msg.sender,
            order.collection,
            order.tokenId,
            order.currency,
            order.price,
            platformFee,
            royalty
        );
    }

    // ---------------------------------------------------------------------
    // Cancellation
    // ---------------------------------------------------------------------

    function cancelOrder(Order calldata order) external {
        if (order.maker != msg.sender) revert NotOrderMaker();
        bytes32 orderHash = hashOrder(order);
        cancelledOrFilled[orderHash] = true;
        emit OrderCancelled(orderHash, msg.sender);
    }

    /// @notice Void every outstanding order below `newMinNonce` in one transaction.
    function bumpNonce(uint256 newMinNonce) external {
        if (newMinNonce <= minNonce[msg.sender]) revert NonceTooLow(newMinNonce, minNonce[msg.sender]);
        minNonce[msg.sender] = newMinNonce;
        emit NonceBumped(msg.sender, newMinNonce);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function hashOrder(Order calldata order) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ORDER_TYPEHASH,
                    order.maker,
                    order.collection,
                    order.tokenId,
                    order.currency,
                    order.price,
                    order.startTime,
                    order.endTime,
                    order.nonce,
                    order.salt,
                    order.isListing
                )
            )
        );
    }

    /// @notice Exact split a fill would produce, so a UI can show it before anyone signs.
    function previewSplit(Order calldata order)
        external
        view
        returns (uint256 platformFee, uint256 royalty, address royaltyReceiver, uint256 toSeller)
    {
        (platformFee, royalty, royaltyReceiver) = _split(order);
        toSeller = order.price - platformFee - royalty;
    }

    function isValidOrder(Order calldata order, bytes calldata signature) external view returns (bool) {
        bytes32 orderHash = hashOrder(order);
        if (cancelledOrFilled[orderHash]) return false;
        if (order.nonce < minNonce[order.maker]) return false;
        if (block.timestamp < order.startTime || block.timestamp >= order.endTime) return false;
        if (order.price == 0) return false;
        return SignatureChecker.isValidSignatureNow(order.maker, orderHash, signature);
    }

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _validate(Order calldata order, bytes calldata signature) private view returns (bytes32 orderHash) {
        if (order.price == 0) revert ZeroPrice();
        if (block.timestamp < order.startTime) revert OrderNotStarted(order.startTime);
        if (block.timestamp >= order.endTime) revert OrderExpired(order.endTime);
        if (order.nonce < minNonce[order.maker]) revert NonceTooLow(order.nonce, minNonce[order.maker]);

        orderHash = hashOrder(order);
        if (cancelledOrFilled[orderHash]) revert OrderAlreadyUsed(orderHash);
        if (!SignatureChecker.isValidSignatureNow(order.maker, orderHash, signature)) {
            revert InvalidSignature();
        }
    }

    function _split(Order calldata order)
        private
        view
        returns (uint256 platformFee, uint256 royalty, address royaltyReceiver)
    {
        platformFee = feeRouter.feeOn(IFeeRouter.Product.NftMarketplace, order.price);

        // ERC-2981 is optional and collections are untrusted, so a missing, reverting or
        // malformed implementation must degrade to "no royalty" rather than block the trade.
        try IERC2981(order.collection).royaltyInfo(order.tokenId, order.price) returns (
            address receiver, uint256 amount
        ) {
            if (receiver != address(0) && amount != 0) {
                uint256 cap = (order.price * MAX_ROYALTY_BPS) / 10_000;
                royalty = amount > cap ? cap : amount;
                royaltyReceiver = receiver;
            }
        } catch {
            // no royalty
        }
    }

    function _sendNative(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    /// @dev No `receive`: this contract is never a resting place for value.
}
