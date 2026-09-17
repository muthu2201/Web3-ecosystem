// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IFeeRouter
/// @notice Non-custodial fee accounting for every revenue point in the ecosystem.
/// @dev The router never touches trade principal. Product contracts compute a fee from the
///      configuration exposed here and forward exactly that fee; the remainder of every user
///      transaction settles directly between the user and the DEX/pool/counterparty.
interface IFeeRouter {
    /// @notice Every revenue point. The ordinal is part of the on-chain ABI: append only, never reorder.
    enum Product {
        TokenDeploy, // 0 - flat native fee only
        BondingCurveTrade, // 1 - bps of trade value
        Graduation, // 2 - flat native fee only
        Swap, // 3 - bps of input amount (direct-router path)
        Presale, // 4 - bps of raise
        FairLaunch, // 5 - bps of raise
        NftDeploy, // 6 - flat native fee only
        NftMint, // 7 - bps of mint price
        NftMarketplace // 8 - bps of sale price
    }

    /// @param bps Fee in basis points applied to a value-denominated product.
    /// @param creatorShareBps Portion of the collected fee credited to the creator, in bps of the fee.
    /// @param flatNative Flat fee in native currency applied to a per-action product.
    struct FeeConfig {
        uint16 bps;
        uint16 creatorShareBps;
        uint128 flatNative;
    }

    event FeeConfigProposed(Product indexed product, FeeConfig config, uint64 eta);
    event FeeConfigExecuted(Product indexed product, FeeConfig config);
    event FeeConfigProposalCancelled(Product indexed product);
    event TreasuryProposed(address indexed treasury, uint64 eta);
    event TreasuryExecuted(address indexed treasury);
    event TreasuryProposalCancelled(address indexed treasury);
    event FeeRouted(
        Product indexed product,
        address indexed token,
        address indexed creator,
        uint256 creatorAmount,
        uint256 treasuryAmount
    );
    event Withdrawn(address indexed account, address indexed token, address indexed to, uint256 amount);

    error FeeExceedsHardCap(uint256 requested, uint256 cap);
    error ShareExceedsTotal(uint256 requested);
    error TimelockNotElapsed(uint64 eta);
    error NoPendingProposal();
    error ZeroAddress();
    error ZeroAmount();
    error NothingToWithdraw();
    error NativeTransferFailed();
    error UnexpectedNativeValue();

    function feeConfig(Product product) external view returns (FeeConfig memory);

    function maxBps(Product product) external pure returns (uint16);

    function flatNativeHardCap() external view returns (uint256);

    function treasury() external view returns (address);

    function timelockDelay() external view returns (uint64);

    /// @notice Fee in basis points currently configured for `product`.
    function bpsOf(Product product) external view returns (uint16);

    /// @notice Flat native fee currently configured for `product`.
    function flatNativeOf(Product product) external view returns (uint256);

    /// @notice Fee owed on `amount` for `product`, rounded down.
    function feeOn(Product product, uint256 amount) external view returns (uint256);

    /// @notice Credit a native-currency fee, splitting it between `creator` and the treasury.
    function routeNative(Product product, address creator) external payable;

    /// @notice Pull `amount` of `token` from the caller and credit it as a fee for `product`.
    function routeERC20(Product product, address token, address creator, uint256 amount) external;

    /// @notice Withdraw the caller's accrued balance of `token` (address(0) for native) to `to`.
    function withdraw(address token, address to) external returns (uint256 amount);

    function balanceOf(address account, address token) external view returns (uint256);
}
