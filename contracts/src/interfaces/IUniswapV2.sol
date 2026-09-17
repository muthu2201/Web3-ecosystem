// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Minimal Uniswap V2 / PancakeSwap V2 / Aerodrome-compatible surface.
/// @dev Declared locally rather than vendored so the ecosystem compiles against a single
///      Solidity version. Only the functions actually used are declared, which keeps the
///      trusted external surface small and auditable.
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);

    /// @notice Mints LP against whatever token balances the pair currently holds.
    /// @dev Called directly by `BondingCurve._graduate()` instead of routing through
    ///      `addLiquidity`, which leaves no dust and cannot be bricked by a stray transfer.
    function mint(address to) external returns (uint256 liquidity);

    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    function sync() external;

    // solhint-disable-next-line func-name-mixedcase
    function MINIMUM_LIQUIDITY() external pure returns (uint256);
}

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    // solhint-disable-next-line func-name-mixedcase
    function WETH() external view returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}
