// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFeeRouter} from "../../src/fees/IFeeRouter.sol";
import {NftCollection} from "../../src/nft/NftCollection.sol";
import {NftFactory} from "../../src/nft/NftFactory.sol";
import {NftMarketplace} from "../../src/nft/NftMarketplace.sol";
import {Fixture} from "../Fixture.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NftTest is Fixture {
    NftCollection internal collection;

    uint256 internal constant MAX_SUPPLY = 1000;
    uint256 internal constant PRICE = 0.05 ether;

    uint256 internal makerPk = 0xA11CE;
    address internal maker;

    function setUp() public {
        _deployEcosystem();
        maker = vm.addr(makerPk);
        vm.deal(maker, 100 ether);

        uint256 fee = feeRouter.flatNativeOf(IFeeRouter.Product.NftDeploy);
        vm.prank(creator);
        address addr = nftFactory.deployCollection{value: fee}(
            NftFactory.DeployParams({
                name: "Art",
                symbol: "ART",
                baseURI: "ipfs://base/",
                contractURI: "ipfs://contract.json",
                maxSupply: MAX_SUPPLY,
                owner: creator,
                royaltyReceiver: creator,
                royaltyBps: 500,
                salt: keccak256("art")
            })
        );
        collection = NftCollection(payable(addr));

        vm.prank(creator);
        collection.addPhase(
            NftCollection.Phase({
                merkleRoot: bytes32(0),
                price: PRICE,
                startsAt: uint64(block.timestamp),
                endsAt: uint64(block.timestamp + 30 days),
                maxPerWallet: 5,
                maxSupply: 0
            })
        );
    }

    // -----------------------------------------------------------------
    // Minting
    // -----------------------------------------------------------------

    function test_MintDeliversTokensAndRoutesFee() public {
        uint256 qty = 3;
        uint256 cost = PRICE * qty;
        uint256 expectedFee = (cost * 100) / 10_000; // 1% NftMint fee
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));

        vm.prank(alice);
        uint256 first = collection.mint{value: cost}(0, qty, new bytes32[](0));

        assertEq(collection.balanceOf(alice), qty);
        assertEq(collection.ownerOf(first), alice);
        assertEq(collection.totalMinted(), qty);
        assertEq(collection.proceeds(), cost - expectedFee);
        assertEq(feeRouter.balanceOf(treasury, address(0)) - treasuryBefore, expectedFee);
    }

    function test_MintRequiresExactPayment() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NftCollection.IncorrectPayment.selector, PRICE, PRICE * 2));
        collection.mint{value: PRICE}(0, 2, new bytes32[](0));
    }

    function test_PerWalletLimitIsEnforced() public {
        vm.prank(alice);
        collection.mint{value: PRICE * 5}(0, 5, new bytes32[](0));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NftCollection.WalletLimitExceeded.selector, 6, 5));
        collection.mint{value: PRICE}(0, 1, new bytes32[](0));
    }

    function test_MaxSupplyIsEnforced() public {
        vm.prank(creator);
        collection.addPhase(
            NftCollection.Phase({
                merkleRoot: bytes32(0),
                price: 0,
                startsAt: uint64(block.timestamp),
                endsAt: uint64(block.timestamp + 30 days),
                maxPerWallet: 0,
                maxSupply: 0
            })
        );
        vm.prank(alice);
        collection.mint(1, MAX_SUPPLY, new bytes32[](0));
        assertEq(collection.totalMinted(), MAX_SUPPLY);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NftCollection.MaxSupplyExceeded.selector, 1, 0));
        collection.mint(1, 1, new bytes32[](0));
    }

    function test_PhaseWindowIsEnforced() public {
        vm.prank(creator);
        uint256 id = collection.addPhase(
            NftCollection.Phase({
                merkleRoot: bytes32(0),
                price: PRICE,
                startsAt: uint64(block.timestamp + 1 days),
                endsAt: uint64(block.timestamp + 2 days),
                maxPerWallet: 0,
                maxSupply: 0
            })
        );
        vm.prank(alice);
        vm.expectRevert();
        collection.mint{value: PRICE}(id, 1, new bytes32[](0));

        vm.warp(vm.getBlockTimestamp() + 1 days);
        vm.prank(alice);
        collection.mint{value: PRICE}(id, 1, new bytes32[](0));
        assertEq(collection.balanceOf(alice), 1);
    }

    function test_AllowlistPhaseGatesMinting() public {
        bytes32 aliceLeaf = keccak256(bytes.concat(keccak256(abi.encode(alice))));
        bytes32 bobLeaf = keccak256(bytes.concat(keccak256(abi.encode(bob))));
        bytes32 root = aliceLeaf < bobLeaf
            ? keccak256(abi.encodePacked(aliceLeaf, bobLeaf))
            : keccak256(abi.encodePacked(bobLeaf, aliceLeaf));

        vm.prank(creator);
        uint256 id = collection.addPhase(
            NftCollection.Phase({
                merkleRoot: root,
                price: PRICE,
                startsAt: uint64(block.timestamp),
                endsAt: uint64(block.timestamp + 1 days),
                maxPerWallet: 2,
                maxSupply: 0
            })
        );

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;
        vm.prank(alice);
        collection.mint{value: PRICE}(id, 1, proof);
        assertEq(collection.balanceOf(alice), 1);

        vm.prank(carol);
        vm.expectRevert(NftCollection.NotAllowlisted.selector);
        collection.mint{value: PRICE}(id, 1, proof);
    }

    /// @dev A phase that is live or finished must be immutable, so a creator cannot change the
    ///      price or allowlist out from under people already minting in it.
    function test_LivePhaseCannotBeEdited() public {
        vm.prank(creator);
        vm.expectRevert();
        collection.updatePhase(
            0,
            NftCollection.Phase({
                merkleRoot: bytes32(0),
                price: 100 ether,
                startsAt: uint64(block.timestamp),
                endsAt: uint64(block.timestamp + 1 days),
                maxPerWallet: 5,
                maxSupply: 0
            })
        );
    }

    function test_ProceedsAreWithdrawableByOwnerOnly() public {
        vm.prank(alice);
        collection.mint{value: PRICE * 2}(0, 2, new bytes32[](0));

        vm.prank(bob);
        vm.expectRevert();
        collection.withdrawProceeds(bob);

        uint256 expected = collection.proceeds();
        uint256 before = creator.balance;
        vm.prank(creator);
        collection.withdrawProceeds(creator);
        assertEq(creator.balance - before, expected);
        assertEq(collection.proceeds(), 0);
    }

    // -----------------------------------------------------------------
    // Metadata and royalties
    // -----------------------------------------------------------------

    function test_TokenUriAndContractUri() public {
        vm.prank(alice);
        uint256 id = collection.mint{value: PRICE}(0, 1, new bytes32[](0));
        assertEq(collection.tokenURI(id), "ipfs://base/1");
        assertEq(collection.contractURI(), "ipfs://contract.json");
    }

    function test_FreezingMetadataIsPermanent() public {
        vm.startPrank(creator);
        collection.setBaseURI("ipfs://revealed/");
        collection.freezeMetadata();
        vm.expectRevert(NftCollection.MetadataIsFrozen.selector);
        collection.setBaseURI("ipfs://rugged/");
        vm.expectRevert(NftCollection.MetadataIsFrozen.selector);
        collection.setContractURI("ipfs://rugged.json");
        vm.stopPrank();
        assertTrue(collection.metadataFrozen());
    }

    function test_RoyaltyIsCappedAtTenPercent() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(NftCollection.RoyaltyTooHigh.selector, 1001, 1000));
        collection.setDefaultRoyalty(creator, 1001);
    }

    function test_RoyaltyInfoReportsConfiguredShare() public view {
        (address receiver, uint256 amount) = collection.royaltyInfo(1, 1 ether);
        assertEq(receiver, creator);
        assertEq(amount, 0.05 ether); // 5%
    }

    // -----------------------------------------------------------------
    // Marketplace
    // -----------------------------------------------------------------

    function _order(bool isListing, address currency, uint256 tokenId, uint256 price)
        internal
        view
        returns (NftMarketplace.Order memory)
    {
        return NftMarketplace.Order({
            maker: maker,
            collection: address(collection),
            tokenId: tokenId,
            currency: currency,
            price: price,
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp + 1 days),
            nonce: 1,
            salt: keccak256("salt"),
            isListing: isListing
        });
    }

    function _sign(NftMarketplace.Order memory order) internal view returns (bytes memory) {
        NftMarketplace.Order[] memory wrap = new NftMarketplace.Order[](1);
        wrap[0] = order;
        bytes32 digest = this.hashHelper(wrap);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function hashHelper(NftMarketplace.Order[] calldata o) external view returns (bytes32) {
        return marketplace.hashOrder(o[0]);
    }

    function _mintTo(address who) internal returns (uint256 tokenId) {
        vm.prank(who);
        tokenId = collection.mint{value: PRICE}(0, 1, new bytes32[](0));
    }

    function test_FulfillNativeListingSplitsCorrectly() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        uint256 price = 10 ether;
        NftMarketplace.Order memory order = _order(true, address(0), tokenId, price);
        bytes memory sig = _sign(order);

        (uint256 fee, uint256 royalty, address rr, uint256 toSeller) = marketplace.previewSplit(order);
        assertEq(fee, (price * 50) / 10_000); // 0.5% marketplace fee
        assertEq(royalty, (price * 500) / 10_000); // 5% collection royalty
        assertEq(rr, creator);
        assertEq(toSeller, price - fee - royalty);

        uint256 makerBefore = maker.balance;
        uint256 royaltyBefore = creator.balance;
        uint256 treasuryBefore = feeRouter.balanceOf(treasury, address(0));

        vm.prank(alice);
        marketplace.fulfillListing{value: price}(order, sig);

        assertEq(collection.ownerOf(tokenId), alice);
        assertEq(maker.balance - makerBefore, toSeller);
        assertEq(creator.balance - royaltyBefore, royalty);
        assertEq(feeRouter.balanceOf(treasury, address(0)) - treasuryBefore, fee);
        assertEq(address(marketplace).balance, 0, "marketplace never retains value");
    }

    function test_FulfillErc20ListingSplitsCorrectly() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        uint256 price = 1000e6;
        usdc.mint(alice, price);
        vm.prank(alice);
        usdc.approve(address(marketplace), price);

        NftMarketplace.Order memory order = _order(true, address(usdc), tokenId, price);
        bytes memory sig = _sign(order);
        (uint256 fee, uint256 royalty,, uint256 toSeller) = marketplace.previewSplit(order);

        vm.prank(alice);
        marketplace.fulfillListing(order, sig);

        assertEq(collection.ownerOf(tokenId), alice);
        assertEq(usdc.balanceOf(maker), toSeller);
        assertEq(usdc.balanceOf(creator), royalty);
        assertEq(feeRouter.balanceOf(treasury, address(usdc)), fee);
        assertEq(usdc.balanceOf(address(marketplace)), 0, "no dust retained");
    }

    function test_AcceptBidSettlesInErc20() public {
        uint256 tokenId = _mintTo(alice);
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        uint256 price = 500e6;
        usdc.mint(maker, price);

        vm.prank(maker);
        usdc.approve(address(marketplace), price);
        vm.prank(alice);
        collection.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = _order(false, address(usdc), tokenId, price);
        bytes memory sig = _sign(order);
        (uint256 fee, uint256 royalty,, uint256 toSeller) = marketplace.previewSplit(order);

        vm.prank(alice);
        marketplace.acceptBid(order, sig);

        assertEq(collection.ownerOf(tokenId), maker);
        assertEq(usdc.balanceOf(alice), toSeller);
        assertEq(usdc.balanceOf(creator), royalty);
        assertEq(feeRouter.balanceOf(treasury, address(usdc)), fee);
    }

    function test_NativeBidsAreRejected() public {
        uint256 tokenId = _mintTo(alice);
        NftMarketplace.Order memory order = _order(false, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);
        vm.prank(alice);
        vm.expectRevert(NftMarketplace.NativeNotAllowedForBids.selector);
        marketplace.acceptBid(order, sig);
    }

    function test_OrderCannotBeFilledTwice() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);

        vm.prank(alice);
        marketplace.fulfillListing{value: 1 ether}(order, sig);

        // Alice sends it back so the seller could in principle fill again.
        vm.prank(alice);
        collection.transferFrom(alice, maker, tokenId);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(NftMarketplace.OrderAlreadyUsed.selector, marketplace.hashOrder(order))
        );
        marketplace.fulfillListing{value: 1 ether}(order, sig);
    }

    function test_CancelledOrderCannotBeFilled() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);

        vm.prank(maker);
        marketplace.cancelOrder(order);

        vm.prank(alice);
        vm.expectRevert();
        marketplace.fulfillListing{value: 1 ether}(order, sig);
    }

    function test_NonceBumpVoidsOutstandingOrders() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);

        vm.prank(maker);
        marketplace.bumpNonce(2);

        assertFalse(marketplace.isValidOrder(order, sig));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NftMarketplace.NonceTooLow.selector, 1, 2));
        marketplace.fulfillListing{value: 1 ether}(order, sig);
    }

    function test_ForgedSignatureIsRejected() public {
        uint256 tokenId = _mintTo(maker);
        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBADBAD, keccak256("not the order"));
        bytes memory forged = abi.encodePacked(r, s, v);

        vm.prank(alice);
        vm.expectRevert(NftMarketplace.InvalidSignature.selector);
        marketplace.fulfillListing{value: 1 ether}(order, forged);
    }

    /// @dev Tampering with any signed field must invalidate the signature.
    function test_TamperedPriceIsRejected() public {
        uint256 tokenId = _mintTo(maker);
        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 10 ether);
        bytes memory sig = _sign(order);

        order.price = 1 wei; // buyer tries to pay almost nothing
        vm.prank(alice);
        vm.expectRevert(NftMarketplace.InvalidSignature.selector);
        marketplace.fulfillListing{value: 1 wei}(order, sig);
    }

    function test_ExpiredOrderIsRejected() public {
        uint256 tokenId = _mintTo(maker);
        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);

        vm.warp(order.endTime + 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NftMarketplace.OrderExpired.selector, order.endTime));
        marketplace.fulfillListing{value: 1 ether}(order, sig);
    }

    function test_UnderpaymentIsRejected() public {
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);
        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 1 ether);
        bytes memory sig = _sign(order);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NftMarketplace.IncorrectPayment.selector, 0.5 ether, 1 ether));
        marketplace.fulfillListing{value: 0.5 ether}(order, sig);
    }

    /// @dev A collection with no ERC-2981 support must still be tradeable.
    function test_CollectionWithoutRoyaltiesStillTrades() public {
        NoRoyaltyNft plain = new NoRoyaltyNft();
        plain.mint(maker, 1);
        vm.prank(maker);
        plain.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = NftMarketplace.Order({
            maker: maker,
            collection: address(plain),
            tokenId: 1,
            currency: address(0),
            price: 1 ether,
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp + 1 days),
            nonce: 1,
            salt: keccak256("plain"),
            isListing: true
        });
        bytes32 digest = marketplace.hashOrder(order);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerPk, digest);

        vm.prank(alice);
        marketplace.fulfillListing{value: 1 ether}(order, abi.encodePacked(r, s, v));
        assertEq(plain.ownerOf(1), alice);
    }

    function test_MarketplaceFeeCannotExceedOnePercent() public {
        _setFee(IFeeRouter.Product.NftMarketplace, 100, 0, 0);
        uint256 tokenId = _mintTo(maker);
        vm.prank(maker);
        collection.setApprovalForAll(address(marketplace), true);

        NftMarketplace.Order memory order = _order(true, address(0), tokenId, 10 ether);
        (uint256 fee,,,) = marketplace.previewSplit(order);
        assertEq(fee, (10 ether * 100) / 10_000);
        assertLe((fee * 10_000) / 10 ether, 100, "hard ceiling holds");
    }
}

/// @notice ERC-721 with no ERC-2981 implementation at all.
contract NoRoyaltyNft is IERC721 {
    mapping(uint256 => address) private _owners;
    mapping(address => mapping(address => bool)) private _operators;

    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1;
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_owners[tokenId] == from, "not owner");
        require(from == msg.sender || _operators[from][msg.sender], "not approved");
        _owners[tokenId] = to;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function approve(address, uint256) external {}

    function setApprovalForAll(address operator, bool approved) external {
        _operators[msg.sender][operator] = approved;
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operators[owner][operator];
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
