/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const TokenVestingAbi = [
  {
    "type": "function",
    "name": "createSchedule",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "start",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "cliffDuration",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "duration",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "revocable",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getSchedule",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct TokenVesting.Schedule",
        "components": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "beneficiary",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "grantor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "totalAmount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "released",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "start",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "cliffDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "duration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "revocable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "revoked",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextScheduleId",
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
    "name": "releasable",
    "inputs": [
      {
        "name": "scheduleId",
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
    "name": "release",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
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
    "type": "function",
    "name": "revoke",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "returned",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "schedulesOfBeneficiary",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "schedulesOfGrantor",
    "inputs": [
      {
        "name": "grantor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalCommitted",
    "inputs": [
      {
        "name": "token",
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
    "name": "transferBeneficiary",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newBeneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vestedAmount",
    "inputs": [
      {
        "name": "scheduleId",
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
    "type": "event",
    "name": "BeneficiaryTransferred",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Released",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "beneficiary",
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
    "type": "event",
    "name": "Revoked",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "grantor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "returnedAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ScheduleCreated",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "grantor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "start",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "cliffDuration",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "duration",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "revocable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyRevoked",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AmountTooLarge",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "CliffExceedsDuration",
    "inputs": [
      {
        "name": "cliffDuration",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "duration",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotBeneficiary",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotGrantor",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotRevocable",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NothingToRelease",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "UnknownSchedule",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
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
  },
  {
    "type": "error",
    "name": "ZeroDuration",
    "inputs": []
  }
] as const;
