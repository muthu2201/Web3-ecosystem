/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const PresaleFactoryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeRouter_",
        "type": "address",
        "internalType": "contract IFeeRouter"
      }
    ],
    "stateMutability": "nonpayable"
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
    "name": "createPresale",
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
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "presale",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
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
    "name": "isPresale",
    "inputs": [
      {
        "name": "presale",
        "type": "address",
        "internalType": "address"
      }
    ],
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
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
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
    "name": "predictPresaleAddress",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
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
    "name": "presaleImplementation",
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
    "name": "presalesOfToken",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "presalesPaged",
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
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPresaleImplementation",
    "inputs": [
      {
        "name": "implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalPresales",
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
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PresaleCreated",
    "inputs": [
      {
        "name": "presale",
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
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokensFunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "isFairLaunch",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PresaleImplementationSet",
    "inputs": [
      {
        "name": "implementation",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ImplementationAlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ImplementationNotSet",
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
    "name": "TokenFundingMismatch",
    "inputs": [
      {
        "name": "received",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "required",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;
