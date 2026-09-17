// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPlatformToken, RiskFlags} from "./IPlatformToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TaxToken
/// @notice Fixed-supply ERC-20 with a fee on DEX buys and sells, for projects funding treasury
///         or marketing from trade flow.
///
/// @dev ROUTABILITY WARNING. Fee-on-transfer breaks Uniswap v3/v4 and most aggregator routes.
///      This template is only safe to pair into Uniswap v2-style and PancakeSwap v2 pools, and
///      the platform marks it "limited routability" everywhere it is surfaced.
///
/// @dev THE HONEYPOT DEFENCE. The classic tax rug is to launch at 3% and quietly raise the sell
///      tax to 99% once liquidity arrives. That is impossible here:
///
///      * `ABSOLUTE_MAX_TAX_BPS` is a compile-time constant of 10%.
///      * `maxTaxBps` is chosen at deployment, bounded by that constant, and is `immutable`.
///      * `setTaxes` is monotonically decreasing - it reverts if either rate would rise.
///
///      So the tax a buyer reads at any moment is a hard ceiling on the tax they can ever pay.
///      Wallet-to-wallet transfers are never taxed.
contract TaxToken is ERC20, ERC20Burnable, ERC20Permit, Ownable, IPlatformToken {
    uint16 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Compile-time ceiling no deployment can exceed.
    uint16 public constant ABSOLUTE_MAX_TAX_BPS = 1_000; // 10%

    /// @notice Per-deployment ceiling, fixed at construction and bounded by ABSOLUTE_MAX_TAX_BPS.
    uint16 public immutable maxTaxBps;

    address public immutable deployer;
    uint256 public immutable initialSupply;

    /// @notice Current buy tax in bps. Can only ever decrease.
    uint16 public buyTaxBps;

    /// @notice Current sell tax in bps. Can only ever decrease.
    uint16 public sellTaxBps;

    /// @notice Receives collected tax, in token units.
    address public taxRecipient;

    /// @notice AMM pair addresses. A transfer out of one is a buy; a transfer into one is a sell.
    mapping(address => bool) public isAmmPair;

    /// @notice Addresses exempt from tax (router, treasury, vesting, locker).
    mapping(address => bool) public isExcludedFromTax;

    event TaxesLowered(uint16 buyTaxBps, uint16 sellTaxBps);
    event TaxRecipientUpdated(address indexed recipient);
    event AmmPairUpdated(address indexed pair, bool isPair);
    event TaxExclusionUpdated(address indexed account, bool excluded);

    error ZeroAddress();
    error ZeroSupply();
    error TaxAboveCap(uint16 requested, uint16 cap);
    error TaxCannotIncrease(uint16 requested, uint16 current);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 supply,
        address recipient,
        address owner_,
        address taxRecipient_,
        uint16 maxTaxBps_,
        uint16 buyTaxBps_,
        uint16 sellTaxBps_
    ) ERC20(name_, symbol_) ERC20Permit(name_) Ownable(owner_) {
        if (recipient == address(0) || owner_ == address(0) || taxRecipient_ == address(0)) {
            revert ZeroAddress();
        }
        if (supply == 0) revert ZeroSupply();
        if (maxTaxBps_ > ABSOLUTE_MAX_TAX_BPS) revert TaxAboveCap(maxTaxBps_, ABSOLUTE_MAX_TAX_BPS);
        if (buyTaxBps_ > maxTaxBps_) revert TaxAboveCap(buyTaxBps_, maxTaxBps_);
        if (sellTaxBps_ > maxTaxBps_) revert TaxAboveCap(sellTaxBps_, maxTaxBps_);

        deployer = msg.sender;
        initialSupply = supply;
        maxTaxBps = maxTaxBps_;
        buyTaxBps = buyTaxBps_;
        sellTaxBps = sellTaxBps_;
        taxRecipient = taxRecipient_;

        isExcludedFromTax[owner_] = true;
        isExcludedFromTax[taxRecipient_] = true;
        isExcludedFromTax[recipient] = true;

        _mint(recipient, supply);
    }

    /// @notice Lower either tax. Reverts if either value would rise. There is no path that raises a tax.
    function setTaxes(uint16 newBuyTaxBps, uint16 newSellTaxBps) external onlyOwner {
        if (newBuyTaxBps > buyTaxBps) revert TaxCannotIncrease(newBuyTaxBps, buyTaxBps);
        if (newSellTaxBps > sellTaxBps) revert TaxCannotIncrease(newSellTaxBps, sellTaxBps);
        buyTaxBps = newBuyTaxBps;
        sellTaxBps = newSellTaxBps;
        emit TaxesLowered(newBuyTaxBps, newSellTaxBps);
    }

    function setTaxRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        taxRecipient = recipient;
        isExcludedFromTax[recipient] = true;
        emit TaxRecipientUpdated(recipient);
    }

    function setAmmPair(address pair, bool isPair) external onlyOwner {
        if (pair == address(0)) revert ZeroAddress();
        isAmmPair[pair] = isPair;
        emit AmmPairUpdated(pair, isPair);
    }

    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isExcludedFromTax[account] = excluded;
        emit TaxExclusionUpdated(account, excluded);
    }

    /// @notice Tax in bps that would apply to a transfer between `from` and `to` right now.
    /// @dev Exposed so the UI and the platform's own simulation can quote the exact rate a user
    ///      will pay before they sign, rather than estimating it.
    function taxBpsFor(address from, address to) public view returns (uint16) {
        if (from == address(0) || to == address(0)) return 0; // mint / burn
        if (isExcludedFromTax[from] || isExcludedFromTax[to]) return 0;
        if (isAmmPair[from]) return buyTaxBps;
        if (isAmmPair[to]) return sellTaxBps;
        return 0; // wallet-to-wallet is never taxed
    }

    /// @inheritdoc IPlatformToken
    function templateId() external pure returns (bytes32) {
        return keccak256("web3eco.token.tax.v1");
    }

    /// @inheritdoc IPlatformToken
    function riskFlags() external view returns (uint256) {
        uint256 flags = RiskFlags.OWNED;
        if (buyTaxBps != 0 || sellTaxBps != 0) flags |= RiskFlags.TAXED;
        return flags;
    }

    function _update(address from, address to, uint256 value) internal override {
        uint16 taxBps = taxBpsFor(from, to);
        if (taxBps == 0 || value == 0) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * taxBps) / BPS_DENOMINATOR;
        // `fee < value` always holds because taxBps <= 1000 < BPS_DENOMINATOR.
        if (fee != 0) {
            // taxRecipient is excluded from tax, so this leg cannot re-enter the tax path.
            super._update(from, taxRecipient, fee);
        }
        super._update(from, to, value - fee);
    }
}
