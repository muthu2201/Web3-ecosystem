// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Plain test ERC-20 with open minting.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _decimals = d;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice ERC-20 that burns a fixed percentage of every transfer.
/// @dev Used to prove `FeeRouter.routeERC20` credits what it actually received rather than what
///      it was told to pull. Crediting the requested amount would let a deflationary fee token
///      drain the router's real balance below its internal accounting.
contract FeeOnTransferERC20 is ERC20 {
    uint256 public immutable feeBps;

    constructor(uint256 feeBps_) ERC20("FeeOnTransfer", "FOT") {
        feeBps = feeBps_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * feeBps) / 10_000;
        if (fee != 0) super._update(from, address(0xdead), fee);
        super._update(from, to, value - fee);
    }
}

/// @notice Rejects every incoming native transfer.
contract RejectsNative {
    error Nope();

    receive() external payable {
        revert Nope();
    }
}
