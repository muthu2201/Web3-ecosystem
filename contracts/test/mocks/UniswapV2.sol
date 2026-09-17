// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IUniswapV2Pair} from "../../src/interfaces/IUniswapV2.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice WETH9-equivalent, including the bool-returning `transfer` that trips naive integrations.
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "WETH: transfer failed");
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}

/// @notice Faithful Uniswap V2 pair: real constant-product accounting, real MINIMUM_LIQUIDITY
///         burn, real 0.30% swap fee and real K check.
/// @dev Ported to Solidity 0.8 checked arithmetic rather than stubbed, so graduation is exercised
///      against the same mint maths that runs on Base and BNB Chain. A behavioural mock would
///      have hidden exactly the rounding and first-mint edge cases graduation depends on.
contract MockUniswapV2Pair is ERC20 {
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;

    address public factory;
    address public token0;
    address public token1;

    uint112 private _reserve0;
    uint112 private _reserve1;
    uint32 private _blockTimestampLast;

    uint256 private _unlocked = 1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    modifier lock() {
        require(_unlocked == 1, "UniswapV2: LOCKED");
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    constructor() ERC20("Uniswap V2", "UNI-V2") {
        factory = msg.sender;
    }

    function initialize(address t0, address t1) external {
        require(msg.sender == factory, "UniswapV2: FORBIDDEN");
        token0 = t0;
        token1 = t1;
    }

    function getReserves() public view returns (uint112, uint112, uint32) {
        return (_reserve0, _reserve1, _blockTimestampLast);
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "UniswapV2: OVERFLOW");
        _reserve0 = uint112(balance0);
        _reserve1 = uint112(balance1);
        _blockTimestampLast = uint32(block.timestamp);
        emit Sync(_reserve0, _reserve1);
    }

    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 r0, uint112 r1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - r0;
        uint256 amount1 = balance1 - r1;

        uint256 supply = totalSupply();
        if (supply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // permanently locked
        } else {
            liquidity = Math.min((amount0 * supply) / r0, (amount1 * supply) / r1);
        }
        require(liquidity > 0, "UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 supply = totalSupply();
        amount0 = (liquidity * balance0) / supply;
        amount1 = (liquidity * balance1) / supply;
        require(amount0 > 0 && amount1 > 0, "UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);
        _update(
            IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this))
        );
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata) external lock {
        require(amount0Out > 0 || amount1Out > 0, "UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 r0, uint112 r1,) = getReserves();
        require(amount0Out < r0 && amount1Out < r1, "UniswapV2: INSUFFICIENT_LIQUIDITY");

        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        {
            uint256 amount0In = balance0 > r0 - amount0Out ? balance0 - (r0 - amount0Out) : 0;
            uint256 amount1In = balance1 > r1 - amount1Out ? balance1 - (r1 - amount1Out) : 0;
            require(amount0In > 0 || amount1In > 0, "UniswapV2: INSUFFICIENT_INPUT_AMOUNT");

            // 0.30% fee, enforced through the K check exactly as upstream does it.
            uint256 adjusted0 = balance0 * 1_000 - amount0In * 3;
            uint256 adjusted1 = balance1 * 1_000 - amount1In * 3;
            require(adjusted0 * adjusted1 >= uint256(r0) * uint256(r1) * 1_000_000, "UniswapV2: K");

            emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
        }

        _update(balance0, balance1);
    }

    function sync() external lock {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)));
    }
}

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "UniswapV2: IDENTICAL_ADDRESSES");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(t0 != address(0), "UniswapV2: ZERO_ADDRESS");
        require(getPair[t0][t1] == address(0), "UniswapV2: PAIR_EXISTS");

        pair = address(new MockUniswapV2Pair{salt: keccak256(abi.encodePacked(t0, t1))}());
        MockUniswapV2Pair(pair).initialize(t0, t1);
        getPair[t0][t1] = pair;
        getPair[t1][t0] = pair;
        allPairs.push(pair);
        emit PairCreated(t0, t1, pair, allPairs.length);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}

contract MockUniswapV2Router02 {
    address public immutable factoryAddress;
    address public immutable wethAddress;

    constructor(address factory_, address weth_) {
        factoryAddress = factory_;
        wethAddress = weth_;
    }

    function factory() external view returns (address) {
        return factoryAddress;
    }

    // solhint-disable-next-line func-name-mixedcase
    function WETH() external view returns (address) {
        return wethAddress;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        uint256 amountInWithFee = amountIn * 997;
        return (amountInWithFee * reserveOut) / (reserveIn * 1_000 + amountInWithFee);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; ++i) {
            address pair = MockUniswapV2Factory(factoryAddress).getPair(path[i], path[i + 1]);
            (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
            (uint256 rIn, uint256 rOut) =
                path[i] < path[i + 1] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i + 1] = getAmountOut(amounts[i], rIn, rOut);
        }
    }

    function addLiquidityETH(
        address tokenAddr,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256, uint256, uint256 liquidity) {
        address pair = MockUniswapV2Factory(factoryAddress).getPair(tokenAddr, wethAddress);
        if (pair == address(0)) {
            pair = MockUniswapV2Factory(factoryAddress).createPair(tokenAddr, wethAddress);
        }
        IERC20(tokenAddr).transferFrom(msg.sender, pair, amountTokenDesired);
        MockWETH(payable(wethAddress)).deposit{value: msg.value}();
        IERC20(wethAddress).transfer(pair, msg.value);
        liquidity = MockUniswapV2Pair(pair).mint(to);
        return (amountTokenDesired, msg.value, liquidity);
    }

    /// @notice Swap native for tokens, used by the stress harness to trade a graduated pool.
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external payable {
        require(path.length == 2 && path[0] == wethAddress, "bad path");
        address pair = MockUniswapV2Factory(factoryAddress).getPair(path[0], path[1]);
        MockWETH(payable(wethAddress)).deposit{value: msg.value}();
        IERC20(wethAddress).transfer(pair, msg.value);

        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        (uint256 rIn, uint256 rOut) =
            path[0] < path[1] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        uint256 out = getAmountOut(msg.value, rIn, rOut);
        require(out >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        (uint256 a0, uint256 a1) = path[0] < path[1] ? (uint256(0), out) : (out, uint256(0));
        MockUniswapV2Pair(pair).swap(a0, a1, to, "");
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external {
        require(path.length == 2 && path[1] == wethAddress, "bad path");
        address pair = MockUniswapV2Factory(factoryAddress).getPair(path[0], path[1]);
        IERC20(path[0]).transferFrom(msg.sender, pair, amountIn);

        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        (uint256 rIn, uint256 rOut) =
            path[0] < path[1] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        // Re-derive the actual input in case the token taxes the transfer.
        uint256 actualIn = IERC20(path[0]).balanceOf(pair) - rIn;
        uint256 out = getAmountOut(actualIn, rIn, rOut);
        require(out >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        (uint256 a0, uint256 a1) = path[0] < path[1] ? (uint256(0), out) : (out, uint256(0));
        MockUniswapV2Pair(pair).swap(a0, a1, address(this), "");
        MockWETH(payable(wethAddress)).withdraw(out);
        (bool ok,) = to.call{value: out}("");
        require(ok, "ETH transfer failed");
    }

    receive() external payable {}
}
