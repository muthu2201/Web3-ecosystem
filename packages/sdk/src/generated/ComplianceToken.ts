/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const ComplianceTokenAbi = [
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
        "name": "supply",
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
      },
      {
        "name": "allowlistEnabled_",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "COMPLIANCE_ROLE",
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
    "name": "CUSTODIAN_ROLE",
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
    "name": "PAUSER_ROLE",
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
    "name": "allowlistEnabled",
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
    "name": "forceTransfer",
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
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "isAllowlisted",
    "inputs": [
      {
        "name": "",
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
    "name": "isBlocked",
    "inputs": [
      {
        "name": "",
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
    "name": "setAllowlistEnabled",
    "inputs": [
      {
        "name": "enabled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAllowlisted",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAllowlistedBatch",
    "inputs": [
      {
        "name": "accounts",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBlocked",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "blocked",
        "type": "bool",
        "internalType": "bool"
      }
    ],
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
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AllowlistEnabledUpdated",
    "inputs": [
      {
        "name": "enabled",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AllowlistUpdated",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "allowed",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
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
    "name": "BlocklistUpdated",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "blocked",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
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
    "name": "ForcedTransfer",
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
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
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
    "name": "RecipientBlocked",
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
    "name": "RecipientNotAllowlisted",
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
    "name": "SenderBlocked",
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
    "name": "SenderNotAllowlisted",
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
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroSupply",
    "inputs": []
  }
] as const;

export const ComplianceTokenBytecode = "0x610180806040523461060957612864803803809161001d828561060d565b833981019060c0818303126106095780516001600160401b0381116106095782610048918301610630565b602082015190926001600160401b03821161060957610068918301610630565b9160408201519061007b60608401610685565b60a061008960808601610685565b94015191821515809303610609576040958651916100a7888461060d565b60018352603160f81b6020840190815281519092906001600160401b03811161051957600354600181811c911680156105ff575b60208210146104fb57601f811161059c575b50806020601f8211600114610538575f9161052d575b508160011b915f199060031b1c1916176003555b8051906001600160401b0382116105195760045490600182811c9216801561050f575b60208310146104fb5781601f84931161048d575b50602090601f8311600114610427575f9261041c575b50508160011b915f199060031b1c1916176004555b6101828161095b565b6101205261018f83610ae2565b6101405260208151910120918260e05251902080610100524660a05286519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f84528883015260608201524660808201523060a082015260a081526101fa60c08261060d565b5190206080523060c0526001600160a01b0316928315801592909190828461040b575b6103fc5784156103ed57336101605260ff8019600a5416911617600a5561024381610699565b5061024d8161070f565b50610257816107a2565b5061026181610835565b5061026b816108c8565b506001600160a01b03165f908152600b6020528581208054600160ff1991821681179092558683529187902080549092161790556103da5761037a575b60ff6005541661036b57600254908082018092116103575760207fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef915f936002558484528382528584208181540190558551908152a351611b899081610c1b8239608051816116b1015260a0518161176e015260c05181611682015260e0518161170001526101005181611726015261012051816109260152610140518161094f0152610160518161035b0152f35b634e487b7160e01b5f52601160045260245ffd5b63d93c066560e01b5f5260045ffd5b815f52600c60205260ff835f2054166103c75760ff600a5416806103b1575b156102a8575063eec92f9160e01b5f5260045260245ffd5b50815f52600b60205260ff835f20541615610399565b5063325fbd1560e11b5f5260045260245ffd5b63ec442f0560e01b5f525f60045260245ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b0382161561021d565b015190505f80610164565b60045f9081528281209350601f198516905b818110610475575090846001959493921061045d575b505050811b01600455610179565b01515f1960f88460031b161c191690555f808061044f565b92936020600181928786015181550195019301610439565b60045f529091507f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b601f840160051c810191602085106104f1575b90601f859493920160051c01905b8181106104e3575061014e565b5f81558493506001016104d6565b90915081906104c8565b634e487b7160e01b5f52602260045260245ffd5b91607f169161013a565b634e487b7160e01b5f52604160045260245ffd5b90508301515f610103565b60035f9081528181209250601f198416905b8181106105845750908360019493921061056c575b5050811b01600355610117565b8501515f1960f88460031b161c191690555f8061055f565b9192602060018192868a01518155019401920161054a565b60035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b601f830160051c810191602084106105f5575b601f0160051c01905b8181106105ea57506100ed565b5f81556001016105dd565b90915081906105d4565b90607f16906100db565b5f80fd5b601f909101601f19168101906001600160401b0382119082101761051957604052565b81601f82011215610609578051906001600160401b0382116105195760405192610664601f8401601f19166020018561060d565b8284526020838301011161060957815f9260208093018386015e8301015290565b51906001600160a01b038216820361060957565b6001600160a01b0381165f9081525f5160206127e45f395f51905f52602052604090205460ff1661070a576001600160a01b03165f8181525f5160206127e45f395f51905f5260205260408120805460ff191660011790553391905f5160206127a45f395f51905f528180a4600190565b505f90565b6001600160a01b0381165f9081525f5160206127c45f395f51905f52602052604090205460ff1661070a576001600160a01b03165f8181525f5160206127c45f395f51905f5260205260408120805460ff191660011790553391907f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a905f5160206127a45f395f51905f529080a4600190565b6001600160a01b0381165f9081525f5160206128045f395f51905f52602052604090205460ff1661070a576001600160a01b03165f8181525f5160206128045f395f51905f5260205260408120805460ff191660011790553391907f442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee6985905f5160206127a45f395f51905f529080a4600190565b6001600160a01b0381165f9081525f5160206128445f395f51905f52602052604090205460ff1661070a576001600160a01b03165f8181525f5160206128445f395f51905f5260205260408120805460ff191660011790553391907fe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9905f5160206127a45f395f51905f529080a4600190565b6001600160a01b0381165f9081525f5160206128245f395f51905f52602052604090205460ff1661070a576001600160a01b03165f8181525f5160206128245f395f51905f5260205260408120805460ff191660011790553391907f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6905f5160206127a45f395f51905f529080a4600190565b908151602081105f146109d5575090601f815111610995576020815191015160208210610986571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b6001600160401b03811161051957600654600181811c91168015610ad8575b60208210146104fb57601f8111610aa5575b50602092601f8211600114610a4457928192935f92610a39575b50508160011b915f199060031b1c19161760065560ff90565b015190505f80610a20565b601f1982169360065f52805f20915f5b868110610a8d5750836001959610610a75575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f8080610a67565b91926020600181928685015181550194019201610a54565b60065f52601f60205f20910160051c810190601f830160051c015b818110610acd5750610a06565b5f8155600101610ac0565b90607f16906109f4565b908151602081105f14610b0d575090601f815111610995576020815191015160208210610986571790565b6001600160401b03811161051957600754600181811c91168015610c10575b60208210146104fb57601f8111610bdd575b50602092601f8211600114610b7c57928192935f92610b71575b50508160011b915f199060031b1c19161760075560ff90565b015190505f80610b58565b601f1982169360075f52805f20915f5b868110610bc55750836001959610610bad575b505050811b0160075560ff90565b01515f1960f88460031b161c191690555f8080610b9f565b91926020600181928685015181550194019201610b8c565b60075f52601f60205f20910160051c810190601f830160051c015b818110610c055750610b3e565b5f8155600101610bf8565b90607f1690610b2c56fe60806040526004361015610011575f80fd5b5f3560e01c80620af2a1146110ee57806301ffc9a71461109857806305a3b8091461105b578063062d3bd71461102157806306fdde0314610f7c578063095ea7b314610f5657806318160ddd14610f3957806323b872dd14610f01578063248a9ca314610ed65780632f2ff15d14610e98578063313ce56714610e7d5780633644e51514610e5b57806336568abe14610e175780633f4ba83a14610db157806340c10f1914610c9057806342966c6814610c735780635c975abb14610c5157806365c05aed14610b3857806370a0823114610b0157806379cc679014610ad15780637aa77f2914610a975780637ecebe0014610a5f5780638456cb5914610a0657806384b0196e1461090e57806389021456146107a057806391d148541461075657806394c8e4ff1461073457806395d89b41146106525780639aa54181146105ba578063a217fddf146105a0578063a9059cbb1461056f578063c79445d014610535578063d505accf146103fe578063d5391393146103c4578063d547741f1461037f578063d5f394881461033c578063d7644ba2146102da578063dd62ed3e14610286578063e63ab1e91461024c578063ef7773b01461021c5763fbac3951146101db575f80fd5b34610218576020366003190112610218576001600160a01b036101fc61116c565b165f52600c602052602060ff60405f2054166040519015158152f35b5f80fd5b34610218575f3660031901126102185760ab60ff600a5416610244575b602090604051908152f35b5060bb610239565b34610218575f3660031901126102185760206040517f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a8152f35b346102185760403660031901126102185761029f61116c565b6001600160a01b036102af611182565b91165f5260016020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b34610218576020366003190112610218576004358015158091036102185760207f8797ceff52507921155b9fd95d66d5e357472079569c9790c22e72a4ee2e736e916103246112f2565b60ff19600a541660ff821617600a55604051908152a1005b34610218575f3660031901126102185760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b34610218576040366003190112610218576103c260043561039e611182565b906103bd6103b8825f526009602052600160405f20015490565b6113d0565b611794565b005b34610218575f3660031901126102185760206040517f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a68152f35b346102185760e03660031901126102185761041761116c565b61041f611182565b604435906064359260843560ff8116810361021857844211610522576104f86104ef6001600160a01b039283851697885f52600860205260405f20908154916001830190556040519060208201927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c984528b6040840152878a1660608401528a608084015260a083015260c082015260c081526104bd60e082611284565b5190206104c8611678565b906040519161190160f01b83526002830152602282015260c43591604260a4359220611a88565b90929192611b15565b1684810361050b57506103c2935061198b565b84906325c0072360e11b5f5260045260245260445ffd5b8463313c898160e11b5f5260045260245ffd5b34610218575f3660031901126102185760206040517fe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b98152f35b346102185760403660031901126102185761059561058b61116c565b60243590336114e0565b602060405160018152f35b34610218575f3660031901126102185760206040515f8152f35b34610218576040366003190112610218576105d361116c565b6001600160a01b036105e3611198565b916105ec6112f2565b169081156106435760207f13518841ff4d3053cb7703afaa39b145c6331829b982d42f4d4fd7568b2e8e2491835f52600b82526106388160405f209060ff801983541691151516179055565b6040519015158152a2005b63d92e233d60e01b5f5260045ffd5b34610218575f366003190112610218576040515f600454610672816111cb565b808452906001811690811561071057506001146106b2575b6106ae8361069a81850382611284565b6040519182916020835260208301906111a7565b0390f35b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b8082106106f65750909150810160200161069a61068a565b9192600181602092548385880101520191019092916106de565b60ff191660208086019190915291151560051b8401909101915061069a905061068a565b34610218575f36600319011261021857602060ff600a54166040519015158152f35b346102185760403660031901126102185761076f611182565b6004355f5260096020526001600160a01b0360405f2091165f52602052602060ff60405f2054166040519015158152f35b34610218576080366003190112610218576107b961116c565b6107c1611182565b906044359060643567ffffffffffffffff811161021857366023820112156102185780600401359367ffffffffffffffff851161021857366024868401011161021857335f9081527fba145287cbe273046c502358b95adfdba679ab2e97aef4622dbbf1cf54ff2e57602052604090205460ff16156108d7576001600160a01b03831693841580156108c6575b610643576001600160a01b0382610891836060957fbb53097141337c38a36fed7fae913304cd0c540e1200dbb4c8c1cee707f9f2c29861088c611873565b61188e565b87602460405196879586526040602087015282604087015201858501375f8389018501521695601f01601f19168101030190a3005b506001600160a01b0382161561084e565b63e2517d3f60e01b5f52336004527fe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b960245260445ffd5b34610218575f366003190112610218576109aa61094a7f00000000000000000000000000000000000000000000000000000000000000006119ee565b6109737f0000000000000000000000000000000000000000000000000000000000000000611a51565b60206109b8604051926109868385611284565b5f84525f368137604051958695600f60f81b875260e08588015260e08701906111a7565b9085820360408701526111a7565b4660608501523060808501525f60a085015283810360c08501528180845192838152019301915f5b8281106109ef57505050500390f35b8351855286955093810193928101926001016109e0565b34610218575f36600319011261021857610a1e611361565b610a26611873565b600160ff1960055416176005557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586020604051338152a1005b34610218576020366003190112610218576001600160a01b03610a8061116c565b165f526008602052602060405f2054604051908152f35b34610218575f3660031901126102185760206040517ff7a12deeb029254385e16faab421345c7d7bf8e81e5cfdf83cee594dd4cce21b8152f35b34610218576040366003190112610218576103c2610aed61116c565b60243590610afc823383611411565b611819565b34610218576020366003190112610218576001600160a01b03610b2261116c565b165f525f602052602060405f2054604051908152f35b346102185760403660031901126102185760043567ffffffffffffffff8111610218573660238201121561021857806004013567ffffffffffffffff8111610218576024820191602436918360051b0101116102185790610b97611198565b91610ba06112f2565b821515905f5b818110610baf57005b6001600160a01b03610bca610bc58385886112ba565b6112de565b161561064357806001600160a01b03610be9610bc560019486896112ba565b165f52600b602052610c0a8660405f209060ff801983541691151516179055565b6001600160a01b03610c20610bc58386896112ba565b167f13518841ff4d3053cb7703afaa39b145c6331829b982d42f4d4fd7568b2e8e246020604051878152a201610ba6565b34610218575f36600319011261021857602060ff600554166040519015158152f35b34610218576020366003190112610218576103c260043533611819565b3461021857604036600319011261021857610ca961116c565b335f9081527fd5d09b8f3165a736d25b1a14611612ac91830c1b82012b1c33b2dac7c90a0649602052604090205460ff1615610d7a576001600160a01b038116908115610d6757815f52600c60205260ff60405f205416610d545760ff600a541680610d3d575b610d2a576103c290610d20611873565b602435905f61188e565b5063eec92f9160e01b5f5260045260245ffd5b50815f52600b60205260ff60405f20541615610d10565b5063325fbd1560e11b5f5260045260245ffd5b63ec442f0560e01b5f525f60045260245ffd5b63e2517d3f60e01b5f52336004527f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a660245260445ffd5b34610218575f36600319011261021857610dc9611361565b60055460ff811615610e085760ff19166005557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa6020604051338152a1005b638dfc202b60e01b5f5260045ffd5b3461021857604036600319011261021857610e30611182565b336001600160a01b03821603610e4c576103c290600435611794565b63334bd91960e11b5f5260045ffd5b34610218575f366003190112610218576020610e75611678565b604051908152f35b34610218575f36600319011261021857602060405160128152f35b34610218576040366003190112610218576103c2600435610eb7611182565b90610ed16103b8825f526009602052600160405f20015490565b6115e9565b34610218576020366003190112610218576020610e756004355f526009602052600160405f20015490565b3461021857606036600319011261021857610595610f1d61116c565b610f25611182565b60443591610f34833383611411565b6114e0565b34610218575f366003190112610218576020600254604051908152f35b3461021857604036600319011261021857610595610f7261116c565b602435903361198b565b34610218575f366003190112610218576040515f600354610f9c816111cb565b80845290600181169081156107105750600114610fc3576106ae8361069a81850382611284565b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b8082106110075750909150810160200161069a61068a565b919260018160209254838588010152019101909291610fef565b34610218575f3660031901126102185760206040517f442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee69858152f35b34610218576020366003190112610218576001600160a01b0361107c61116c565b165f52600b602052602060ff60405f2054166040519015158152f35b346102185760203660031901126102185760043563ffffffff60e01b811680910361021857602090637965db0b60e01b81149081156110dd575b506040519015158152f35b6301ffc9a760e01b149050826110d2565b346102185760403660031901126102185761110761116c565b6001600160a01b03611117611198565b916111206112f2565b169081156106435760207f2df5e71bacf8a1a1d232ad715b36ae4617b1f75e7c6283373a54c96556cae75491835f52600c82526106388160405f209060ff801983541691151516179055565b600435906001600160a01b038216820361021857565b602435906001600160a01b038216820361021857565b60243590811515820361021857565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b90600182811c921680156111f9575b60208310146111e557565b634e487b7160e01b5f52602260045260245ffd5b91607f16916111da565b5f9291815491611212836111cb565b8083529260018116908115611267575060011461122e57505050565b5f9081526020812093945091925b83831061124d575060209250010190565b60018160209294939454838587010152019101919061123c565b915050602093945060ff929192191683830152151560051b010190565b90601f8019910116810190811067ffffffffffffffff8211176112a657604052565b634e487b7160e01b5f52604160045260245ffd5b91908110156112ca5760051b0190565b634e487b7160e01b5f52603260045260245ffd5b356001600160a01b03811681036102185790565b335f9081527f4fcb20797bc22b6bdf05ed948026fdc1b31b30d107ac0811a08b18c975bbd64b602052604090205460ff161561132a57565b63e2517d3f60e01b5f52336004527f442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee698560245260445ffd5b335f9081527f84574a31e2f767388bfa57bc81ff2590df95d3022c04c363cca3e37ee9608631602052604090205460ff161561139957565b63e2517d3f60e01b5f52336004527f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a60245260445ffd5b805f52600960205260405f206001600160a01b0333165f5260205260ff60405f205416156113fb5750565b63e2517d3f60e01b5f523360045260245260445ffd5b6001600160a01b03909291921691825f52600160205260405f206001600160a01b0382165f5260205260405f2054925f19841061144f575b50505050565b8284106114bc5780156114a9576001600160a01b03821615611496575f5260016020526001600160a01b0360405f2091165f5260205260405f20910390555f808080611449565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b506001600160a01b038391637dc7a0d960e11b5f521660045260245260445260645ffd5b9291906001600160a01b0384169384156115d6576001600160a01b038216948515610d6757805f52600c60205260ff60405f2054166115c45760ff600a5416806115ad575b61159b5750845f52600c60205260ff60405f2054166115885760ff600a541680611571575b61155e5761155c93945061088c611873565b565b8463eec92f9160e01b5f5260045260245ffd5b50845f52600b60205260ff60405f2054161561154a565b8463325fbd1560e11b5f5260045260245ffd5b6338c08ef960e11b5f5260045260245ffd5b50805f52600b60205260ff60405f20541615611525565b639864515360e01b5f5260045260245ffd5b634b637e8f60e11b5f525f60045260245ffd5b805f52600960205260405f206001600160a01b0383165f5260205260ff60405f205416155f1461167257805f52600960205260405f206001600160a01b0383165f5260205260405f20600160ff198254161790556001600160a01b03339216907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d5f80a4600190565b50505f90565b6001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001630148061176b575b156116d3577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a0815261176560c082611284565b51902090565b507f000000000000000000000000000000000000000000000000000000000000000046146116aa565b805f52600960205260405f206001600160a01b0383165f5260205260ff60405f2054165f1461167257805f52600960205260405f206001600160a01b0383165f5260205260405f2060ff1981541690556001600160a01b03339216907ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b5f80a4600190565b6001600160a01b03811680156115d657805f52600c60205260ff60405f2054166115c45760ff600a54168061185c575b61159b5750905f61155c9261088c611873565b50805f52600b60205260ff60405f20541615611849565b60ff6005541661187f57565b63d93c066560e01b5f5260045ffd5b6001600160a01b0316908161191e576002549083820180921161190a576001600160a01b036020917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef936002555b1693846118f55780600254036002555b604051908152a3565b845f525f825260405f208181540190556118ec565b634e487b7160e01b5f52601160045260245ffd5b815f525f60205260405f2054838110611970576001600160a01b037fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9285602093865f525f85520360405f20556118dc565b91905063391434e360e21b5f5260045260245260445260645ffd5b6001600160a01b03169081156114a9576001600160a01b03169182156114965760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591835f526001825260405f20855f5282528060405f2055604051908152a3565b60ff8114611a345760ff811690601f8211611a255760405191611a12604084611284565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b50604051611a4e81611a47816006611203565b0382611284565b90565b60ff8114611a755760ff811690601f8211611a255760405191611a12604084611284565b50604051611a4e81611a47816007611203565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411611b0a579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa15611aff575f516001600160a01b03811615611af557905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b6004811015611b755780611b27575050565b60018103611b3e5763f645eedf60e01b5f5260045ffd5b60028103611b59575063fce698f760e01b5f5260045260245ffd5b600314611b635750565b6335e2f38360e21b5f5260045260245ffd5b634e487b7160e01b5f52602160045260245ffd2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d84574a31e2f767388bfa57bc81ff2590df95d3022c04c363cca3e37ee9608631ec8156718a8372b1db44bb411437d0870f3e3790d4a08526d024ce1b0b668f6b4fcb20797bc22b6bdf05ed948026fdc1b31b30d107ac0811a08b18c975bbd64bd5d09b8f3165a736d25b1a14611612ac91830c1b82012b1c33b2dac7c90a0649ba145287cbe273046c502358b95adfdba679ab2e97aef4622dbbf1cf54ff2e57" as `0x${string}`;
