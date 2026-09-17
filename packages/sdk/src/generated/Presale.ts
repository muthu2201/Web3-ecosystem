/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const PresaleAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "factory_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeRouter_",
        "type": "address",
        "internalType": "contract IFeeRouter"
      },
      {
        "name": "dexRouter_",
        "type": "address",
        "internalType": "contract IUniswapV2Router02"
      },
      {
        "name": "locker_",
        "type": "address",
        "internalType": "contract LiquidityLocker"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "BURN_ADDRESS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_LIQUIDITY_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_LP_LOCK_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allocationOf",
    "inputs": [
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelled",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "contribute",
    "inputs": [
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "contributionOf",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contributorCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contributorsPaged",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "page",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "dexFactory",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IUniswapV2Factory"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "dexRouter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IUniswapV2Router02"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "endsAt",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "factory",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRouter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IFeeRouter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "finalise",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "finalised",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hardCap",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimed",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "claimed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasRefunded",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "refunded",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct Presale.Params",
        "components": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "liquidityTokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "softCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "hardCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "startsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "endsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "liquidityBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "lockLpInsteadOfBurn",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "lpLockDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "whitelistRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "isFairLaunch",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isFairLaunch",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "liquidityBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "liquidityTokensPerNative",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lockLpInsteadOfBurn",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "locker",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract LiquidityLocker"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lpLockDuration",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxContribution",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minContribution",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "progressBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recoverTokens",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "softCap",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "softCapReached",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "startsAt",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "state",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum Presale.State"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "token",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokensNeeded",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct Presale.Params",
        "components": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "liquidityTokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "softCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "hardCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "startsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "endsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "liquidityBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "lockLpInsteadOfBurn",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "lpLockDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "whitelistRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "isFairLaunch",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "tokensPerNative",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalRaised",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalTokensSold",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "weth",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IWETH"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "whitelistRoot",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Cancelled",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Claimed",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Contributed",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalRaised",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Finalised",
    "inputs": [
      {
        "name": "totalRaised",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "platformFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "toLiquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "toOwner",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "pair",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "liquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "lockId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "params",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct Presale.Params",
        "components": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "liquidityTokensPerNative",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "softCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "hardCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxContribution",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "startsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "endsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "liquidityBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "lockLpInsteadOfBurn",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "lpLockDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "whitelistRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "isFairLaunch",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AboveMaxContribution",
    "inputs": [
      {
        "name": "total",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maximum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AlreadyCancelled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyFinalised",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BelowMinContribution",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minimum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "HardCapExceeded",
    "inputs": [
      {
        "name": "attempted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "room",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientTokenFunding",
    "inputs": [
      {
        "name": "have",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "need",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidParams",
    "inputs": [
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "NativeTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoLiquidityMinted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotFactory",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotLive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotWhitelisted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToRefund",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SaleEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SaleNotEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SoftCapNotReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SoftCapReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnexpectedNativeSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;
