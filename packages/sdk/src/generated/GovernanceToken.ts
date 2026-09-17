/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const GovernanceTokenAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "name_",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "symbol_",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "cap_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "initialSupply",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "CLOCK_MODE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
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
    "type": "function",
    "name": "DOMAIN_SEPARATOR",
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
    "type": "function",
    "name": "MINTER_ROLE",
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
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
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
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
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
    "name": "burn",
    "inputs": [
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "burnFrom",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cap",
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
    "name": "checkpoints",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "pos",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Checkpoints.Checkpoint208",
        "components": [
          {
            "name": "_key",
            "type": "uint48",
            "internalType": "uint48"
          },
          {
            "name": "_value",
            "type": "uint208",
            "internalType": "uint208"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "clock",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "delegate",
    "inputs": [
      {
        "name": "delegatee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "delegateBySig",
    "inputs": [
      {
        "name": "delegatee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "expiry",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "delegates",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
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
    "name": "deployer",
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
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPastTotalSupply",
    "inputs": [
      {
        "name": "timepoint",
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
    "name": "getPastVotes",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "timepoint",
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
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
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
    "type": "function",
    "name": "getVotes",
    "inputs": [
      {
        "name": "account",
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
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
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
    "name": "mint",
    "inputs": [
      {
        "name": "to",
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
    "name": "mintingSealed",
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
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [
      {
        "name": "owner",
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
    "name": "numCheckpoints",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "permit",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "riskFlags",
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
    "name": "sealMinting",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
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
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "templateId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "totalSupply",
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
    "name": "transfer",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DelegateChanged",
    "inputs": [
      {
        "name": "delegator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "fromDelegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "toDelegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DelegateVotesChanged",
    "inputs": [
      {
        "name": "delegate",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "previousVotes",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newVotes",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MintingSealed",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
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
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "CheckpointUnorderedInsertion",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20ExceededCap",
    "inputs": [
      {
        "name": "increasedSupply",
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
    "name": "ERC20ExceededSafeSupply",
    "inputs": [
      {
        "name": "increasedSupply",
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
    "name": "ERC20InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidCap",
    "inputs": [
      {
        "name": "cap",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC2612ExpiredSignature",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC2612InvalidSigner",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC5805FutureLookup",
    "inputs": [
      {
        "name": "timepoint",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "clock",
        "type": "uint48",
        "internalType": "uint48"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC6372InconsistentClock",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InitialSupplyAboveCap",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAccountNonce",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "currentNonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MintingIsSealed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "VotesExpiredSignature",
    "inputs": [
      {
        "name": "expiry",
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
    "name": "ZeroSupply",
    "inputs": []
  }
] as const;

export const GovernanceTokenBytecode = "0x6101a06040523461008d57610021610015610147565b949390939291926101d6565b6040516123f59081610eab823960805181818161055c0152610763015260a0518161171b015260c051816117d8015260e051816116ec0152610100518161176a0152610120518161179001526101405181610a2901526101605181610a52015261018051816110820152f35b5f80fd5b634e487b7160e01b5f52604160045260245ffd5b601f909101601f19168101906001600160401b038211908210176100c857604052565b610091565b604051906100dc6040836100a5565b565b81601f8201121561008d578051906001600160401b0382116100c85760405192610112601f8401601f1916602001856100a5565b8284526020838301011161008d57815f9260208093018386015e8301015290565b51906001600160a01b038216820361008d57565b61334090813803806040519361015d82866100a5565b843982019060c08383031261008d5782516001600160401b03811161008d57826101889185016100de565b602084015190926001600160401b03821161008d576101a89185016100de565b926040810151926060820151926101cd60a06101c660808601610133565b9401610133565b91959493929190565b939293604051906101e86040836100a5565b60018252603160f81b6020830190815281519093906001600160401b0381116100c85761021f8161021a6003546103c5565b6103fd565b6020601f821160011461034157816102589392610250925f91610336575b508160011b915f199060031b1c19161790565b60035561049c565b8315610322578360805261026b8161076b565b6101405261027882610860565b610160526020815191012061010052519020610120524660c05261029a610952565b60a0523060e0526001600160a01b038216158015610311575b6103025782156102f35782116102e4576102de6100dc9333610180526102d881610581565b506105f7565b50610692565b6338df86a360e11b5f5260045ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b038416156102b3565b63392e1e2760e01b5f90815260045260245ffd5b90508501515f61023d565b60035f52601f198216907fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b915f5b8181106103ad5750918391610258959460019410610395575b5050811b0160035561049c565b8601515f1960f88460031b161c191690555f80610388565b9192602060018192868a01518155019401920161036f565b90600182811c921680156103f3575b60208310146103df57565b634e487b7160e01b5f52602260045260245ffd5b91607f16916103d4565b601f8111610409575050565b60035f5260205f20906020601f840160051c83019310610443575b601f0160051c01905b818110610438575050565b5f815560010161042d565b9091508190610424565b601f821161045a57505050565b5f5260205f20906020601f840160051c83019310610492575b601f0160051c01905b818110610487575050565b5f815560010161047c565b9091508190610473565b80519091906001600160401b0381116100c8576104c5816104be6004546103c5565b600461044d565b602092601f8211600114610505576104f5929382915f926104fa575b50508160011b915f199060031b1c19161790565b600455565b015190505f806104e1565b60045f52601f198216937f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b915f5b8681106105695750836001959610610551575b505050811b01600455565b01515f1960f88460031b161c191690555f8080610546565b91926020600181928685015181550194019201610533565b6001600160a01b0381165f9081525f5160206132e05f395f51905f52602052604090205460ff166105f2576001600160a01b03165f8181525f5160206132e05f395f51905f5260205260408120805460ff191660011790553391905f5160206132a05f395f51905f528180a4600190565b505f90565b6001600160a01b0381165f9081525f5160206133005f395f51905f52602052604090205460ff166105f2576001600160a01b0381165f9081525f5160206133005f395f51905f5260205260409020805460ff1916600117905533906001600160a01b03167f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a65f5160206132a05f395f51905f525f80a4600190565b91906001600160a01b0383168015610758576106b86106b383600254610b0e565b600255565b6001600160a01b0384165f90815260208181526040808320805486019055518481527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9190a3608051600254818111610743575050600254926001600160d01b0380851161072c57506100dc929350610a1c565b630e58ae9360e11b5f52600485905260245260445ffd5b63279e7e1560e21b5f5260045260245260445ffd5b63ec442f0560e01b5f525f60045260245ffd5b908151602081105f14610786575090610783906109b1565b90565b6001600160401b0381116100c8576107aa816107a36005546103c5565b600561044d565b602092601f82116001146107e1576107d9929382915f926104fa5750508160011b915f199060031b1c19161790565b60055560ff90565b60055f52601f198216937f036b6384b5eca791c62761152d0c79bb0604c104a5fb6f4eb0703f3154bb3db0915f5b8681106108485750836001959610610830575b505050811b0160055560ff90565b01515f1960f88460031b161c191690555f8080610822565b9192602060018192868501518155019401920161080f565b908151602081105f14610878575090610783906109b1565b6001600160401b0381116100c85761089c816108956006546103c5565b600661044d565b602092601f82116001146108d3576108cb929382915f926104fa5750508160011b915f199060031b1c19161790565b60065560ff90565b60065f52601f198216937ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f915f5b86811061093a5750836001959610610922575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f8080610914565b91926020600181928685015181550194019201610901565b61010051610120516040519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8452604083015260608201524660808201523060a082015260a081526109ab60c0826100a5565b51902090565b601f8151116109dc5760208151910151602082106109cd571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b90610a2681610b1b565b600a5480610ad357505f905b6001600160d01b039182169082160192908311610ace576100dc92610a61904265ffffffffffff16600a610dd4565b50506001600160a01b03168015610ab6575b60086020527f5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c7545f9182526040909120546001600160a01b039081169116610c63565b610ac7610ac283610b1b565b610b4c565b5050610a73565b610afa565b805f19810111610afa57600a5f525f5160206132c05f395f51905f52015460301c90610a32565b634e487b7160e01b5f52601160045260245ffd5b91908201809211610ace57565b6001600160d01b038111610b35576001600160d01b031690565b6306dfcc6560e41b5f5260d060045260245260445ffd5b600a5480610b8957505f905b6001600160d01b0390811691811691909103908111610ace57610b85904265ffffffffffff16600a610dd4565b9091565b805f19810111610ace57600a5f525f5160206132c05f395f51905f52015460301c90610b58565b90815480155f14610beb57505f905b6001600160d01b0390811691811691909103908111610ace57610b859165ffffffffffff421690610dd4565b805f19810111610ace575f83815260209020015f19015460301c90610bbf565b90815480155f14610c4357505f905b6001600160d01b0391821690821601908111610ace57610b859165ffffffffffff421690610dd4565b805f19810111610ace575f83815260209020015f19015460301c90610c1a565b6001600160a01b03808316939291908116908185141580610d56575b610c8b575b5050505050565b81610cfc575b505082610ca0575b8080610c84565b6001600160a01b03165f9081526009602052604090205f5160206133205f395f51905f5291610cd991610cd39091610b1b565b90610c0b565b604080516001600160d01b039384168152919092166020820152a25f8080610c99565b6001600160a01b03165f9081526009602052604090205f5160206133205f395f51905f5290610d3490610d2e86610b1b565b90610bb0565b604080516001600160d01b039384168152919092166020820152a25f80610c91565b50831515610c7f565b5f19810191908211610ace57565b908154680100000000000000008110156100c85760018101808455811015610dc0575f9283526020928390208251929093015160301b65ffffffffffff191665ffffffffffff9290921691909117910155565b634e487b7160e01b5f52603260045260245ffd5b80549293928015610e8057610deb610df691610d5f565b825f5260205f200190565b8054603081901c9365ffffffffffff91821692918116808411610e7157879303610e3d5750610e3992509065ffffffffffff82549181199060301b169116179055565b9190565b915050610e3991610e5d610e4f6100cd565b65ffffffffffff9093168352565b6001600160d01b0386166020830152610d6d565b632520601d60e01b5f5260045ffd5b5090610ea591610e91610e4f6100cd565b6001600160d01b0385166020830152610d6d565b5f919056fe60806040526004361015610011575f80fd5b5f3560e01c806301ffc9a71461029457806306fdde031461028f578063095ea7b31461028a57806318160ddd1461028557806323b872dd14610280578063248a9ca31461027b5780632f2ff15d14610276578063313ce56714610271578063355274ea1461026c5780633644e5151461026757806336568abe146102625780633a46b1a81461025d57806340c10f191461025857806342966c68146102535780634bf5d7e91461024e578063587cde1e146102495780635c19a95c146102445780636fcfff451461023f57806370a082311461023a57806379cc6790146102355780637aa77f29146102305780637ecebe001461022b57806384b0196e146102265780638e539e8c1461022157806391d148541461021c57806391ddadf41461021757806395d89b41146102125780639ab24eb01461020d578063a217fddf14610208578063a9059cbb14610203578063af9dc1e1146101fe578063c3cda520146101f9578063d505accf146101f4578063d5391393146101ef578063d547741f146101ea578063d5f39488146101e5578063dd62ed3e146101e0578063ef7773b0146101db578063f1127ed8146101d65763f15de7aa146101d1575f80fd5b6111e8565b611132565b6110ff565b6110a6565b611063565b611025565b610feb565b610ec3565b610dae565b610d6c565b610d46565b610d2c565b610ce4565b610c3f565b610c1d565b610bcd565b610b0e565b610a11565b6109d9565b61099f565b61096f565b61093a565b6108d8565b6108b6565b610875565b610816565b6107f9565b6106c1565b6105dd565b610599565b61057f565b610545565b61052a565b6104e5565b6104b2565b61047a565b61045d565b61042c565b610326565b346102ea5760203660031901126102ea5760043563ffffffff60e01b81168091036102ea57602090637965db0b60e01b81149081156102d9575b506040519015158152f35b6301ffc9a760e01b1490505f6102ce565b5f80fd5b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b9060206103239281815201906102ee565b90565b346102ea575f3660031901126102ea576040515f6003546103468161128c565b80845290600181169081156103dc575060011461037e575b61037a8361036e8185038261137a565b60405191829182610312565b0390f35b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b8082106103c25750909150810160200161036e61035e565b9192600181602092548385880101520191019092916103aa565b60ff191660208086019190915291151560051b8401909101915061036e905061035e565b600435906001600160a01b03821682036102ea57565b602435906001600160a01b03821682036102ea57565b346102ea5760403660031901126102ea57610452610448610400565b6024359033611b31565b602060405160018152f35b346102ea575f3660031901126102ea576020600254604051908152f35b346102ea5760603660031901126102ea57610452610496610400565b61049e610416565b604435916104ad8333836113c5565b61149e565b346102ea5760203660031901126102ea5760206104dd6004355f52600b602052600160405f20015490565b604051908152f35b346102ea5760403660031901126102ea57610528600435610504610416565b9061052361051e825f52600b602052600160405f20015490565b611600565b611648565b005b346102ea575f3660031901126102ea57602060405160128152f35b346102ea575f3660031901126102ea5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b346102ea575f3660031901126102ea5760206104dd6116e2565b346102ea5760403660031901126102ea576004356105b5610416565b336001600160a01b038216036105ce57610528916117fe565b63334bd91960e11b5f5260045ffd5b346102ea5760403660031901126102ea576105f6610400565b6001600160a01b0360243591165f52600960205261061760405f2091611890565b8154905f829160058411610669575b610631935084611d3a565b908161064e57505060205f5b6001600160d01b0360405191168152f35b6106596020926118e7565b905f52815f20015460301c61063d565b919261067481611bc5565b81039081116106bc5761063193855f5265ffffffffffff8260205f2001541665ffffffffffff8516105f146106aa575091610626565b9291506106b6906118f5565b90610626565b611278565b346102ea5760403660031901126102ea576106da610400565b6024356106e5611591565b60ff600c54166107ea576001600160a01b03821680156107d75761071361070e83600254611903565b600255565b61072d836001600160a01b03165f525f60205260405f2090565b8054830190556040518281525f907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90602090a37f00000000000000000000000000000000000000000000000000000000000000006002548181116107c2575050600254916001600160d01b038084116107ab5761052883836121cd565b630e58ae9360e11b5f52600484905260245260445ffd5b63279e7e1560e21b5f5260045260245260445ffd5b63ec442f0560e01b5f525f60045260245ffd5b636f93435960e01b5f5260045ffd5b346102ea5760203660031901126102ea5761052860043533611910565b346102ea575f3660031901126102ea5761037a60405161083760408261137a565b600e81527f6d6f64653d74696d657374616d7000000000000000000000000000000000000060208201526040519182916020835260208301906102ee565b346102ea5760203660031901126102ea576001600160a01b03610896610400565b165f52600860205260206001600160a01b0360405f205416604051908152f35b346102ea5760203660031901126102ea576105286108d2610400565b33611a3c565b346102ea5760203660031901126102ea576001600160a01b036108f9610400565b165f52600960205260405f205463ffffffff81116109235760405163ffffffff9091168152602090f35b6306dfcc6560e41b5f52602060045260245260445ffd5b346102ea5760203660031901126102ea5760206104dd610958610400565b6001600160a01b03165f525f60205260405f205490565b346102ea5760403660031901126102ea5761052861098b610400565b6024359061099a8233836113c5565b611910565b346102ea575f3660031901126102ea5760206040517f55a085f0cb5799a76a3a1ce020a3c47042d4d1524caec7e5957ef73d6e5b73f88152f35b346102ea5760203660031901126102ea576001600160a01b036109fa610400565b165f526007602052602060405f2054604051908152f35b346102ea575f3660031901126102ea57610ab5610a4d7f0000000000000000000000000000000000000000000000000000000000000000611ecb565b610a767f0000000000000000000000000000000000000000000000000000000000000000611f2b565b6020604051610a85828261137a565b5f815281610ac381830194601f198301368737604051978897600f60f81b895260e0858a015260e08901906102ee565b9087820360408901526102ee565b914660608701523060808701525f60a087015285830360c087015251918281520192915f5b828110610af757505050500390f35b835185528695509381019392810192600101610ae8565b346102ea5760203660031901126102ea57610b2a600435611890565b600a54905f829160058411610b79575b610b469350600a611d3a565b80610b5757506040515f8152602090f35b610b74610b656020926118e7565b600a5f52825f20015460301c90565b61063d565b9192610b8481611bc5565b81039081116106bc57610b4693600a5f5265ffffffffffff8260205f2001541665ffffffffffff8516105f14610bbb575091610b3a565b929150610bc7906118f5565b90610b3a565b346102ea5760403660031901126102ea57602060ff610c11600435610bf0610416565b905f52600b845260405f20906001600160a01b03165f5260205260405f2090565b54166040519015158152f35b346102ea575f3660031901126102ea57602060405165ffffffffffff42168152f35b346102ea575f3660031901126102ea576040515f600454610c5f8161128c565b80845290600181169081156103dc5750600114610c865761037a8361036e8185038261137a565b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b808210610cca5750909150810160200161036e61035e565b919260018160209254838588010152019101909291610cb2565b346102ea5760203660031901126102ea576001600160a01b03610d05610400565b165f52600960205260206001600160d01b03610d2360405f20611ad2565b16604051908152f35b346102ea575f3660031901126102ea5760206040515f8152f35b346102ea5760403660031901126102ea57610452610d62610400565b602435903361149e565b346102ea575f3660031901126102ea57602060ff600c54166040519015158152f35b6064359060ff821682036102ea57565b6084359060ff821682036102ea57565b346102ea5760c03660031901126102ea57610dc7610400565b60243590604435610dd6610d8e565b6084359060a43592804211610eb15791610e5c9391610e4e610e539460405160208101917fe48329057bfd03d55e49b547132e39cffd9c1820ad7b9d4c5307691425d15adf83526001600160a01b038a1660408301528a6060830152608082015260808152610e4660a08261137a565b519020611afc565b611f62565b9092919261200d565b610e80816001600160a01b03165f52600760205260405f2080549060018201905590565b809303610e91576105289250611a3c565b6001600160a01b0391506301d4b62360e61b5f521660045260245260445ffd5b632341d78760e11b5f5260045260245ffd5b346102ea5760e03660031901126102ea57610edc610400565b610ee4610416565b6044359060643592610ef4610d9e565b60a43560c43590864211610fd857610f9d92610f98610f2d866001600160a01b03165f52600760205260405f2080549060018201905590565b9860405160208101917f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c983526001600160a01b0389169b8c60408401526001600160a01b038b1660608401528b608084015260a083015260c082015260c08152610e4660e08261137a565b611b22565b936001600160a01b03851603610fb7576105289350611b31565b6325c0072360e11b5f526001600160a01b038085166004521660245260445ffd5b8663313c898160e11b5f5260045260245ffd5b346102ea575f3660031901126102ea5760206040517f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a68152f35b346102ea5760403660031901126102ea57610528600435611044610416565b9061105e61051e825f52600b602052600160405f20015490565b6117fe565b346102ea575f3660031901126102ea5760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b346102ea5760403660031901126102ea5760206110f66110c4610400565b6001600160a01b036110d4610416565b91165f526001835260405f20906001600160a01b03165f5260205260405f2090565b54604051908152f35b346102ea575f3660031901126102ea5761030060ff600c541615611129575b602090604051908152f35b5061038161111e565b346102ea5760403660031901126102ea5761114b610400565b6024359063ffffffff821682036102ea5761037a916001600160a01b03611198926111746113ad565b5061117d6113ad565b50165f52600960205260405f206111926113ad565b50612089565b50604051906111a682611359565b5465ffffffffffff8116825260301c60208201526040519182918291909160206001600160d01b0381604084019565ffffffffffff8151168552015116910152565b346102ea575f3660031901126102ea57335f9081527fdf7de25b7f1fd6d0b5205f0e18f1f35bd7b8d84cce336588d184533ce43a6f76602052604090205460ff161561126157600160ff19600c541617600c557fc32d1c2452e5576cdc0dafad8e664c67f73998d0cb50411db02e7d704ca24ae25f80a1005b63e2517d3f60e01b5f52336004525f60245260445ffd5b634e487b7160e01b5f52601160045260245ffd5b90600182811c921680156112ba575b60208310146112a657565b634e487b7160e01b5f52602260045260245ffd5b91607f169161129b565b5f92918154916112d38361128c565b808352926001811690811561132857506001146112ef57505050565b5f9081526020812093945091925b83831061130e575060209250010190565b6001816020929493945483858701015201910191906112fd565b915050602093945060ff929192191683830152151560051b010190565b634e487b7160e01b5f52604160045260245ffd5b6040810190811067ffffffffffffffff82111761137557604052565b611345565b90601f8019910116810190811067ffffffffffffffff82111761137557604052565b604051906113ab60408361137a565b565b604051906113ba82611359565b5f6020838281520152565b6001600160a01b03909291921690815f5260016020526113f98360405f20906001600160a01b03165f5260205260405f2090565b545f198110611409575b50505050565b81811061147c578215611469576001600160a01b038416156114565761144c925f526001602052039160405f20906001600160a01b03165f5260205260405f2090565b555f808080611403565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b6001600160a01b0384637dc7a0d960e11b5f521660045260245260445260645ffd5b9291906001600160a01b03841693841561157e576001600160a01b03821680156107d7576114dc826001600160a01b03165f525f60205260405f2090565b549584871061155857846113ab969703611506846001600160a01b03165f525f60205260405f2090565b55611521846001600160a01b03165f525f60205260405f2090565b8054860190556040518581527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90602090a3612246565b63391434e360e21b5f526001600160a01b0383166004526024879052604485905260645ffd5b634b637e8f60e11b5f525f60045260245ffd5b335f9081527ff70e363b3d7895af770c4a138460777d52eebd3cb9962ccc6b58721f6127bbc8602052604090205460ff16156115c957565b63e2517d3f60e01b5f52336004527f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a660245260445ffd5b805f52600b60205260ff6116283360405f20906001600160a01b03165f5260205260405f2090565b5416156116325750565b63e2517d3f60e01b5f523360045260245260445ffd5b805f52600b60205260ff6116708360405f20906001600160a01b03165f5260205260405f2090565b54166116dc57805f52600b60205261169c8260405f20906001600160a01b03165f5260205260405f2090565b805460ff1916600117905533916001600160a01b0316907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d5f80a4600190565b50505f90565b6001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000163014806117d5575b1561173d577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a081526117cf60c08261137a565b51902090565b507f00000000000000000000000000000000000000000000000000000000000000004614611714565b805f52600b60205260ff6118268360405f20906001600160a01b03165f5260205260405f2090565b5416156116dc57805f52600b6020526118538260405f20906001600160a01b03165f5260205260405f2090565b805460ff1916905533916001600160a01b0316907ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b5f80a4600190565b65ffffffffffff4216808210156118d1575065ffffffffffff81116118ba5765ffffffffffff1690565b6306dfcc6560e41b5f52603060045260245260445ffd5b90637669fc0f60e11b5f5260045260245260445ffd5b5f198101919082116106bc57565b90600182018092116106bc57565b919082018092116106bc57565b6001600160a01b03811690811561157e5761193b816001600160a01b03165f525f60205260405f2090565b54838110611a175790611966846113ab95949303916001600160a01b03165f525f60205260405f2090565b5581600254036002555f817fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405180602081018782520390a380156119ff575b6119b86119b3836120b2565b612193565b50505f908152600860205260408120549080527f5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c7546001600160a01b039081169116611d9e565b611a10611a0b836120b2565b612159565b50506119a7565b63391434e360e21b5f526001600160a01b03909116600452602452604482905260645ffd5b6001600160a01b038181165f81815260086020526040812080548685167fffffffffffffffffffffffff0000000000000000000000000000000000000000821681179092556113ab96941694611acc9390928691907f3134e8a2e6d97e929a7e54011ea5485d7d196dd5f0ba4d4ef95803e8e3fc257f9080a46001600160a01b03165f525f60205260405f205490565b91611d9e565b80549081611ae05750505f90565b815f198101116106bc575f525f199060205f2001015460301c90565b604290611b076116e2565b906040519161190160f01b8352600283015260228201522090565b916103239391610e5393611f62565b6001600160a01b0316908115611469576001600160a01b0381169283156114565780611b9a7f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92593855f52600160205260405f20906001600160a01b03165f5260205260405f2090565b55604051908152602090a3565b8115611bb1570490565b634e487b7160e01b5f52601260045260245ffd5b600181111561032357806001700100000000000000000000000000000000831015611cf8575b611c9e611c94611c8a611c80611c76611c6c611c5b611ca59760048a68010000000000000000611caa9c1015611ceb575b640100000000811015611cde575b62010000811015611cd1575b610100811015611cc4575b6010811015611cb7575b1015611caf575b60030260011c90565b611c65818b611ba7565b0160011c90565b611c65818a611ba7565b611c658189611ba7565b611c658188611ba7565b611c658187611ba7565b611c658186611ba7565b8093611ba7565b821190565b900390565b60011b611c52565b60041c9160021b91611c4b565b60081c9160041b91611c41565b60101c9160081b91611c36565b60201c9160101b91611c2a565b60401c9160201b91611c1c565b5050611caa611ca5611c9e611c94611c8a611c80611c76611c6c611c5b611d1f8a60801c90565b9850680100000000000000009750611beb9650505050505050565b91905b838210611d4a5750505090565b9091928083169080841860011c82018092116106bc57845f5265ffffffffffff8260205f2001541665ffffffffffff8416105f14611d8c5750925b9190611d3d565b939250611d98906118f5565b91611d85565b91906001600160a01b038116926001600160a01b038116908482141580611ec2575b611dcc575b5050505050565b81611e5f575b505082611de1575b8080611dc5565b611e54611e3b7fdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a72493611e35611e2f6001600160d01b03956001600160a01b03165f52600960205260405f2090565b916120b2565b90612120565b6040805192851683529316602082015291829190820190565b0390a25f8080611dda565b6001600160d01b03611eb8611e3b611ea97fdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724946001600160a01b03165f52600960205260405f2090565b611eb2886120b2565b906120e3565b0390a25f80611dd2565b50831515611dc0565b60ff8114611f115760ff811690601f8211611f025760405191611eef60408461137a565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b5060405161032381611f248160056112c4565b038261137a565b60ff8114611f4f5760ff811690601f8211611f025760405191611eef60408461137a565b5060405161032381611f248160066112c4565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411611fe4579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa15611fd9575f516001600160a01b03811615611fcf57905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b60041115611ff957565b634e487b7160e01b5f52602160045260245ffd5b61201681611fef565b8061201f575050565b61202881611fef565b6001810361203f5763f645eedf60e01b5f5260045ffd5b61204881611fef565b60028103612063575063fce698f760e01b5f5260045260245ffd5b8061206f600392611fef565b146120775750565b6335e2f38360e21b5f5260045260245ffd5b805482101561209e575f5260205f2001905f90565b634e487b7160e01b5f52603260045260245ffd5b6001600160d01b0381116120cc576001600160d01b031690565b6306dfcc6560e41b5f5260d060045260245260445ffd5b906001600160d01b03806120f684611ad2565b92169116036001600160d01b0381116106bc5761211c9165ffffffffffff42169061231f565b9091565b906001600160d01b038061213384611ad2565b92169116016001600160d01b0381116106bc5761211c9165ffffffffffff42169061231f565b6001600160d01b038061216c600a611ad2565b92169116016001600160d01b0381116106bc5761211c904265ffffffffffff16600a61231f565b6001600160d01b03806121a6600a611ad2565b92169116036001600160d01b0381116106bc5761211c904265ffffffffffff16600a61231f565b906001600160a01b036113ab926121e6611a0b846120b2565b5050168015612233575b60086020527f5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c7545f9182526040909120546001600160a01b039081169116611d9e565b61223f6119b3836120b2565b50506121f0565b906001600160a01b03806113ab9493169182156122ab575b16908115612298575b5f5260086020526001600160a01b0360405f205416905f5260086020526001600160a01b0360405f20541690611d9e565b6122a46119b3846120b2565b5050612267565b6122b7611a0b856120b2565b505061225e565b805468010000000000000000811015611375576122e091600182018155612089565b61230c5781516020929092015160301b65ffffffffffff191665ffffffffffff92909216919091179055565b634e487b7160e01b5f525f60045260245ffd5b805492939280156123cb57612336612341916118e7565b825f5260205f200190565b8054603081901c9365ffffffffffff918216929181168084116123bc57879303612388575061238492509065ffffffffffff82549181199060301b169116179055565b9190565b915050612384916123a861239a61139c565b65ffffffffffff9093168352565b6001600160d01b03861660208301526122be565b632520601d60e01b5f5260045ffd5b50906123f0916123dc61239a61139c565b6001600160d01b03851660208301526122be565b5f9190562f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0dc65a7bb8d6351c1cf70c95a316cc6a92839c986682d98bc35f958f4883f9d2a7df7de25b7f1fd6d0b5205f0e18f1f35bd7b8d84cce336588d184533ce43a6f76f70e363b3d7895af770c4a138460777d52eebd3cb9962ccc6b58721f6127bbc8dec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724" as `0x${string}`;
