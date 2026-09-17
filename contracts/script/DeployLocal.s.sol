// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MerkleDistributor} from "../src/distribution/MerkleDistributor.sol";
import {TokenVesting} from "../src/distribution/TokenVesting.sol";
import {FeeRouter} from "../src/fees/FeeRouter.sol";
import {IFeeRouter} from "../src/fees/IFeeRouter.sol";
import {IUniswapV2Router02} from "../src/interfaces/IUniswapV2.sol";
import {BondingCurve} from "../src/launch/BondingCurve.sol";
import {BondingCurveFactory} from "../src/launch/BondingCurveFactory.sol";
import {Presale} from "../src/launch/Presale.sol";
import {PresaleFactory} from "../src/launch/PresaleFactory.sol";
import {LiquidityLocker} from "../src/liquidity/LiquidityLocker.sol";
import {NftFactory} from "../src/nft/NftFactory.sol";
import {NftMarketplace} from "../src/nft/NftMarketplace.sol";
import {TokenFactory} from "../src/tokens/TokenFactory.sol";
import {
    ComplianceTokenDeployer,
    GovernanceTokenDeployer,
    MintableTokenDeployer,
    PausableTokenDeployer,
    StandardTokenDeployer,
    TaxTokenDeployer
} from "../src/tokens/deployers/TokenDeployers.sol";
import {MockUniswapV2Factory, MockUniswapV2Router02, MockWETH} from "../test/mocks/UniswapV2.sol";
import {Script} from "forge-std/Script.sol";

/// @title DeployLocal
/// @notice Deploys the ecosystem plus a local DEX to an Anvil node and writes an address manifest.
///
/// @dev Used by the SDK integration tests and the stress harness. Unlike `Deploy`, this one also
///      turns fees on immediately — there is no multisig to wait on locally, and the tests need
///      non-zero fees to have anything to assert about.
///
///      Writing the manifest to JSON rather than parsing it out of stdout means the TypeScript
///      side reads exact addresses instead of scraping log output that could change format.
contract DeployLocal is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        MockWETH weth = new MockWETH();
        MockUniswapV2Factory dexFactory = new MockUniswapV2Factory();
        MockUniswapV2Router02 dexRouter = new MockUniswapV2Router02(address(dexFactory), address(weth));

        // 24h is the contract's minimum timelock; the tests warp past it.
        FeeRouter feeRouter = new FeeRouter(deployer, deployer, 0.01 ether, 24 hours);
        LiquidityLocker locker = new LiquidityLocker();
        TokenFactory tokenFactory = new TokenFactory(deployer, feeRouter);
        // Each template lives behind its own deployer so the factory stays inside EIP-170.
        tokenFactory.bindDeployers(
            new StandardTokenDeployer(address(tokenFactory)),
            new MintableTokenDeployer(address(tokenFactory)),
            new PausableTokenDeployer(address(tokenFactory)),
            new GovernanceTokenDeployer(address(tokenFactory)),
            new TaxTokenDeployer(address(tokenFactory)),
            new ComplianceTokenDeployer(address(tokenFactory))
        );
        TokenVesting vesting = new TokenVesting();
        MerkleDistributor distributor = new MerkleDistributor();
        NftFactory nftFactory = new NftFactory(deployer, feeRouter);
        NftMarketplace marketplace = new NftMarketplace(feeRouter);

        BondingCurveFactory curveFactory = new BondingCurveFactory(deployer, feeRouter, _curveConfig());
        BondingCurve curveImpl =
            new BondingCurve(address(curveFactory), feeRouter, IUniswapV2Router02(address(dexRouter)), locker);
        curveFactory.setCurveImplementation(address(curveImpl));

        PresaleFactory presaleFactory = new PresaleFactory(deployer, feeRouter);
        Presale presaleImpl =
            new Presale(address(presaleFactory), feeRouter, IUniswapV2Router02(address(dexRouter)), locker);
        presaleFactory.setPresaleImplementation(address(presaleImpl));

        _proposeFees(feeRouter);

        vm.stopBroadcast();

        _writeManifest(
            address(feeRouter),
            address(tokenFactory),
            address(locker),
            address(curveFactory),
            address(presaleFactory),
            address(vesting),
            address(distributor),
            address(nftFactory),
            address(marketplace),
            address(dexRouter),
            address(weth)
        );
    }

    function _curveConfig() internal pure returns (BondingCurveFactory.CurveConfig memory) {
        return BondingCurveFactory.CurveConfig({
            totalSupply: 1_000_000_000e18,
            curveSupply: 800_000_000e18,
            virtualNativeStart: 1.5 ether,
            virtualTokenStart: 1_073_000_000e18,
            antiSnipeWindow: 60,
            maxBuyDuringWindow: 0.5 ether,
            devBuyCapBps: 2000
        });
    }

    /// @dev Queues every fee. The caller warps past the timelock and executes them.
    function _proposeFees(FeeRouter feeRouter) internal {
        _propose(feeRouter, IFeeRouter.Product.TokenDeploy, 0, 0, 0.002 ether);
        _propose(feeRouter, IFeeRouter.Product.BondingCurveTrade, 100, 5000, 0);
        _propose(feeRouter, IFeeRouter.Product.Graduation, 0, 0, 0.003 ether);
        _propose(feeRouter, IFeeRouter.Product.Swap, 25, 0, 0);
        _propose(feeRouter, IFeeRouter.Product.Presale, 200, 0, 0);
        _propose(feeRouter, IFeeRouter.Product.FairLaunch, 100, 0, 0);
        _propose(feeRouter, IFeeRouter.Product.NftDeploy, 0, 0, 0.001 ether);
        _propose(feeRouter, IFeeRouter.Product.NftMint, 100, 0, 0);
        _propose(feeRouter, IFeeRouter.Product.NftMarketplace, 50, 0, 0);
    }

    function _propose(FeeRouter feeRouter, IFeeRouter.Product p, uint16 bps, uint16 creatorShareBps, uint128 flat)
        internal
    {
        feeRouter.proposeFeeConfig(
            p, IFeeRouter.FeeConfig({bps: bps, creatorShareBps: creatorShareBps, flatNative: flat})
        );
    }

    function _writeManifest(
        address feeRouter,
        address tokenFactory,
        address locker,
        address curveFactory,
        address presaleFactory,
        address vesting,
        address distributor,
        address nftFactory,
        address marketplace,
        address dexRouter,
        address weth
    ) internal {
        string memory json = string.concat(
            '{"feeRouter":"',
            vm.toString(feeRouter),
            '","tokenFactory":"',
            vm.toString(tokenFactory),
            '","liquidityLocker":"',
            vm.toString(locker),
            '","bondingCurveFactory":"',
            vm.toString(curveFactory),
            '","presaleFactory":"',
            vm.toString(presaleFactory),
            '","tokenVesting":"',
            vm.toString(vesting),
            '","merkleDistributor":"',
            vm.toString(distributor),
            '","nftFactory":"',
            vm.toString(nftFactory),
            '","nftMarketplace":"',
            vm.toString(marketplace),
            '","dexRouter":"',
            vm.toString(dexRouter),
            '","weth":"',
            vm.toString(weth),
            '"}'
        );
        vm.writeFile("artifacts/local-deployment.json", json);
    }
}
