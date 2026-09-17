/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const FeeRouterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initialTreasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "flatNativeHardCap_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "timelockDelay_",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ABSOLUTE_FLAT_NATIVE_CEILING",
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
    "name": "MAX_TIMELOCK_DELAY",
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
    "name": "MIN_TIMELOCK_DELAY",
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
    "name": "NATIVE",
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
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token",
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
    "name": "bpsOf",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
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
    "name": "cancelFeeConfig",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelTreasury",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeFeeConfig",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeTreasury",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "feeConfig",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IFeeRouter.FeeConfig",
        "components": [
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "creatorShareBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "flatNative",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeOn",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "flatNativeHardCap",
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
    "name": "flatNativeOf",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
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
    "name": "lowerFeeImmediately",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "newBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "newFlatNative",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "maxBps",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "pure"
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
    "name": "pendingFeeConfig",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "outputs": [
      {
        "name": "config",
        "type": "tuple",
        "internalType": "struct IFeeRouter.FeeConfig",
        "components": [
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "creatorShareBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "flatNative",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      },
      {
        "name": "eta",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
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
    "name": "pendingTreasury",
    "inputs": [],
    "outputs": [
      {
        "name": "newTreasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "eta",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proposeFeeConfig",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "config",
        "type": "tuple",
        "internalType": "struct IFeeRouter.FeeConfig",
        "components": [
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "creatorShareBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "flatNative",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "proposeTreasury",
    "inputs": [
      {
        "name": "newTreasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "routeERC20",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "routeNative",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "timelockDelay",
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
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "treasury",
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
    "name": "withdraw",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
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
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "FeeConfigExecuted",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "config",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct IFeeRouter.FeeConfig",
        "components": [
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "creatorShareBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "flatNative",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeConfigProposalCancelled",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.Product"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeConfigProposed",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "config",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct IFeeRouter.FeeConfig",
        "components": [
          {
            "name": "bps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "creatorShareBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "flatNative",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      },
      {
        "name": "eta",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeRouted",
    "inputs": [
      {
        "name": "product",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IFeeRouter.Product"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "creatorAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "treasuryAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasuryExecuted",
    "inputs": [
      {
        "name": "treasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasuryProposalCancelled",
    "inputs": [
      {
        "name": "treasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasuryProposed",
    "inputs": [
      {
        "name": "treasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "eta",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
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
    "name": "FeeExceedsHardCap",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cap",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "NoPendingProposal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
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
    "name": "ShareExceedsTotal",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "TimelockNotElapsed",
    "inputs": [
      {
        "name": "eta",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnexpectedNativeValue",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const;
