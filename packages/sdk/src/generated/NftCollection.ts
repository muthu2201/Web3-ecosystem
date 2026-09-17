/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const NftCollectionAbi = [
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
        "name": "baseURI_",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "contractURI_",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "maxSupply_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "royaltyReceiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "royaltyBps",
        "type": "uint96",
        "internalType": "uint96"
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
    "name": "MAX_ROYALTY_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint96",
        "internalType": "uint96"
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
    "name": "addPhase",
    "inputs": [
      {
        "name": "phase",
        "type": "tuple",
        "internalType": "struct NftCollection.Phase",
        "components": [
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "price",
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
            "name": "maxPerWallet",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxSupply",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
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
    "name": "contractURI",
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
    "name": "freezeMetadata",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getApproved",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "getPhase",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct NftCollection.Phase",
        "components": [
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "price",
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
            "name": "maxPerWallet",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxSupply",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isApprovedForAll",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
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
    "name": "maxSupply",
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
    "name": "metadataFrozen",
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
    "name": "mint",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "quantity",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "firstTokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "mintedInPhase",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "ownerOf",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "phaseCount",
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
    "name": "proceeds",
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
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "royaltyInfo",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salePrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
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
    "name": "safeTransferFrom",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "safeTransferFrom",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setApprovalForAll",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBaseURI",
    "inputs": [
      {
        "name": "newBaseURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setContractURI",
    "inputs": [
      {
        "name": "newContractURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDefaultRoyalty",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "bps",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTokenRoyalty",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "bps",
        "type": "uint96",
        "internalType": "uint96"
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
    "name": "tokenURI",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
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
    "name": "totalMinted",
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
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "updatePhase",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "phase",
        "type": "tuple",
        "internalType": "struct NftCollection.Phase",
        "components": [
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "price",
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
            "name": "maxPerWallet",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxSupply",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawProceeds",
    "inputs": [
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
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ApprovalForAll",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BaseURIUpdated",
    "inputs": [
      {
        "name": "baseURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContractURIUpdated",
    "inputs": [
      {
        "name": "contractURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MetadataFrozen",
    "inputs": [
      {
        "name": "baseURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Minted",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "phaseId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "quantity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "pricePaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fee",
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
    "name": "PhaseAdded",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "phase",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct NftCollection.Phase",
        "components": [
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "price",
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
            "name": "maxPerWallet",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxSupply",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PhaseUpdated",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "phase",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct NftCollection.Phase",
        "components": [
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "price",
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
            "name": "maxPerWallet",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxSupply",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProceedsWithdrawn",
    "inputs": [
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
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ERC2981InvalidDefaultRoyalty",
    "inputs": [
      {
        "name": "numerator",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "denominator",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC2981InvalidDefaultRoyaltyReceiver",
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
    "name": "ERC2981InvalidTokenRoyalty",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "numerator",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "denominator",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC2981InvalidTokenRoyaltyReceiver",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC721IncorrectOwner",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "ERC721InsufficientApproval",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC721InvalidApprover",
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
    "name": "ERC721InvalidOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC721InvalidOwner",
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
    "name": "ERC721InvalidReceiver",
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
    "name": "ERC721InvalidSender",
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
    "name": "ERC721NonexistentToken",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "IncorrectPayment",
    "inputs": [
      {
        "name": "sent",
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
    "name": "MaxSupplyExceeded",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "remaining",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "MetadataIsFrozen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NativeTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAllowlisted",
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
    "name": "PhaseNotActive",
    "inputs": [
      {
        "name": "startsAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "endsAt",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "PhaseSupplyExceeded",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "remaining",
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
    "name": "RoyaltyTooHigh",
    "inputs": [
      {
        "name": "bps",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "cap",
        "type": "uint96",
        "internalType": "uint96"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownPhase",
    "inputs": [
      {
        "name": "phaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "WalletLimitExceeded",
    "inputs": [
      {
        "name": "attempted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
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
    "name": "ZeroQuantity",
    "inputs": []
  }
] as const;

export const NftCollectionBytecode = "0x60e0604052346107b957612d9180380380610019816107bd565b928339810190610120818303126107b95780516001600160401b0381116107b957826100469183016107e2565b60208201516001600160401b0381116107b957836100659184016107e2565b60408301519092906001600160401b0381116107b957846100879183016107e2565b606082015190946001600160401b0382116107b9576100a79183016107e2565b936080820151926100ba60a08401610833565b6100c660c08501610833565b60e0850151966001600160601b038816959192918689036107b9576101000151936001600160a01b03851685036107b9578051906001600160401b03821161039d575f5490600182811c921680156107af575b602083101461049a5781601f849311610742575b50602090601f83116001146106df575f926106d4575b50508160011b915f199060031b1c1916175f555b8051906001600160401b03821161039d5760015490600182811c921680156106ca575b602083101461049a5781601f84931161065c575b50602090601f83116001146105f6575f926105eb575b50508160011b915f199060031b1c1916176001555b6001600160a01b031680156105d857600980546001600160a01b031990811690915560088054918216831790556001600160a01b03167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f80a36001600a819055600c556001600160a01b03169384156105c95780156105ba576103e884116105a1573360c05260a0526080528051906001600160401b03821161039d57600d5490600182811c92168015610597575b602083101461049a5781601f849311610529575b50602090601f83116001146104c3575f926104b8575b50508160011b915f199060031b1c191617600d555b83516001600160401b03811161039d57600e54600181811c911680156104ae575b602082101461049a57601f8111610437575b50602094601f82116001146103d4579481929394955f926103c9575b50508160011b915f199060031b1c191617600e555b61271081116103b15760408051908101906001600160401b0382118183101761039d576040918252838152602001919091526001600160a01b0390911660a09290921b6001600160a01b031916919091176006555161254990816108488239608051818181610280015281816105b20152610765015260a0518181816104830152610a4f015260c05181610a140152f35b634e487b7160e01b5f52604160045260245ffd5b636f483d0960e01b5f5260045261271060245260445ffd5b015190505f806102f7565b601f19821695600e5f52805f20915f5b88811061041f57508360019596979810610407575b505050811b01600e5561030c565b01515f1960f88460031b161c191690555f80806103f9565b919260206001819286850151815501940192016103e4565b600e5f527fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd601f830160051c81019160208410610490575b601f0160051c01905b81811061048557506102db565b5f8155600101610478565b909150819061046f565b634e487b7160e01b5f52602260045260245ffd5b90607f16906102c9565b015190505f80610293565b600d5f9081528281209350601f198516905b81811061051157509084600195949392106104f9575b505050811b01600d556102a8565b01515f1960f88460031b161c191690555f80806104eb565b929360206001819287860151815501950193016104d5565b600d5f529091507fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb5601f840160051c8101916020851061058d575b90601f859493920160051c01905b81811061057f575061027d565b5f8155849350600101610572565b9091508190610564565b91607f1691610269565b8363b9015a6160e01b5f526004526103e860245260445ffd5b63f4f5b73360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b631e4fbdf760e01b5f525f60045260245ffd5b015190505f806101a4565b60015f9081528281209350601f198516905b818110610644575090846001959493921061062c575b505050811b016001556101b9565b01515f1960f88460031b161c191690555f808061061e565b92936020600181928786015181550195019301610608565b60015f529091507fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6601f840160051c810191602085106106c0575b90601f859493920160051c01905b8181106106b2575061018e565b5f81558493506001016106a5565b9091508190610697565b91607f169161017a565b015190505f80610143565b5f8080528281209350601f198516905b81811061072a5750908460019594939210610712575b505050811b015f55610157565b01515f1960f88460031b161c191690555f8080610705565b929360206001819287860151815501950193016106ef565b5f80529091507f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563601f840160051c810191602085106107a5575b90601f859493920160051c01905b818110610797575061012d565b5f815584935060010161078a565b909150819061077c565b91607f1691610119565b5f80fd5b6040519190601f01601f191682016001600160401b0381118382101761039d57604052565b81601f820112156107b9578051906001600160401b03821161039d57610811601f8301601f19166020016107bd565b92828452602083830101116107b957815f9260208093018386015e8301015290565b51906001600160a01b03821682036107b95756fe6080806040526004361015610012575f80fd5b5f905f3560e01c90816301ffc9a714611edd5750806304634d8d14611e2157806306fdde0314611d7f578063081812fc14611d42578063095ea7b314611c5657806316ef376b14611ba757806318a49fa414611a5a57806323b872dd14611a435780632a55205a146119bf5780633dca40e6146119a357806342842e0e1461197a57806355b5ec641461195d57806355f804b3146117745780635944c7531461168357806362810c81146115bf5780636352211e1461159057806370a082311461153f578063715018a6146114d657806379ba50971461144d5780638da5cb5b146114275780639276c66e14611278578063938e3d7b1461106657806395d89b4114610f9c578063a22cb46514610f01578063a2309ff814610ee4578063b88d4fde14610e5a578063c87b56dd14610bb3578063ce436f9214610b6e578063d111515d14610a72578063d5abeb0114610a38578063d5f39488146109f5578063e30c3978146109cf578063e4faf288146109b2578063e6d37b88146103de578063e8a3d485146102f7578063e985e9c5146102a4578063f29ebf6114610260578063f2fde38b146101f05763fb3cc6c2146101cb575f80fd5b346101ed57806003193601126101ed57602060ff600f54166040519015158152f35b80fd5b50346101ed5760203660031901126101ed576001600160a01b03610212611f62565b61021a6124e2565b16806001600160a01b031960095416176009556001600160a01b03600854167f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227008380a380f35b50346101ed57806003193601126101ed5760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b50346101ed5760403660031901126101ed576001600160a01b0360406102c8611f62565b92826102d2611f78565b9416815260056020522091165f52602052602060ff60405f2054166040519015158152f35b50346101ed57806003193601126101ed576040519080600e549061031a826120b3565b80855291600181169081156103b7575060011461035a575b6103568461034281860382612075565b604051918291602083526020830190611f8e565b0390f35b600e81527fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd939250905b80821061039d5750909150810160200161034282610332565b919260018160209254838588010152019101909291610384565b60ff191660208087019190915292151560051b850190920192506103429150839050610332565b606036600319011261063f5760043560243560443567ffffffffffffffff811161063f573660238201121561063f5780600401359067ffffffffffffffff821161063f573660248360051b8301011161063f57610439612529565b82156109a3576010548410156109905761045b610455856120eb565b5061211b565b9167ffffffffffffffff6040840151168042108015610978575b6109535750600b546104a7817f00000000000000000000000000000000000000000000000000000000000000006124c8565b80861161093d575063ffffffff60a0850151169081610901575b50506080830163ffffffff8151166108ad575b508251610806575b50508160206104ec920151612308565b918234036107ef57805f52601260205260405f206001600160a01b0333165f5260205260405f2061051e8382546124d5565b905561052c82600b546124d5565b600b55600c549161053d81846124d5565b600c555f9380610740575b338015908115905f5b8581106106435750505050846105a8575b936020946040519283528583015260408201527f19f5f791ee407773427bf7b970bbbc3375065c32edd1ab142e23a84f94b0719b60603392a36001600a55604051908152f35b6001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016906001600160a01b0360085416823b1561063f57869260445f92604051998a938492637107f48960e11b84526007600485015260248401525af195861561063457602096610624575b50909450610562565b5f61062e91612075565b5f61061b565b6040513d5f823e3d90fd5b5f80fd5b8361064e828a6124d5565b9061072d575f818152600260205260409020546001600160a01b03168015159185836106f4575b6106dc575b805f52600260205260405f20856001600160a01b031982541617905533827fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef5f80a4506106c957600101610551565b6339e3563760e11b5f525f60045260245ffd5b335f52600360205260405f206001815401905561067a565b50610714815f52600460205260405f206001600160a01b03198154169055565b815f5260036020528560405f205f198154019055610675565b633250574960e11b5f525f60045260245ffd5b604051638fb0642560e01b8152600760048201526024810182905294506020856044817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa948515610634575f956107bb575b506107b36107ab86836124c8565b6011546124d5565b601155610548565b9094506020813d6020116107e7575b816107d760209383612075565b8101031261063f5751938561079d565b3d91506107ca565b82630d35e92160e01b5f523460045260245260445ffd5b92604094919451602081019033825260208152610824604082612075565b5190206040516020810191825260208152610840604082612075565b5190209280515f945b8686101561088a5760248660051b89010135908181105f14610879575f52602052600160405f205b950194610849565b905f52602052600160405f20610871565b92955092955092500361089e5783806104dc565b6306fb10a960e01b5f5260045ffd5b855f52601260205260405f206001600160a01b0333165f5260205263ffffffff6108db8660405f20546124d5565b915116908181116108ec57506104d4565b637b781f3b60e01b5f5260045260245260445ffd5b8082111561093557610912916124c8565b80851161091f57806104c1565b8463fdbb3a9760e01b5f5260045260245260445ffd5b50505f610912565b85637502c12360e11b5f5260045260245260445ffd5b67ffffffffffffffff606085015116906324f6551b60e01b5f5260045260245260445ffd5b5067ffffffffffffffff606085015116421015610475565b836306b6e46160e31b5f5260045260245ffd5b63f4f5b73360e01b5f5260045ffd5b3461063f575f36600319011261063f576020601054604051908152f35b3461063f575f36600319011261063f5760206001600160a01b0360095416604051908152f35b3461063f575f36600319011261063f5760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b3461063f575f36600319011261063f5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b3461063f575f36600319011261063f57610a8a6124e2565b600160ff19600f541617600f55604051602081525f600d54610aab816120b3565b908160208501526001811690815f14610b4c5750600114610aef575b7fac32328134cd103aa01cccc8f61d479f9613e7f9c1de6bfc70c78412b15c18e383830384a1005b919050600d5f527fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb5915f905b808210610b315750909150810160400181610ac7565b91926001816020925460408588010152019101909291610b1b565b60ff191660408086019190915291151560051b84019091019150829050610ac7565b3461063f57604036600319011261063f57610b87611f78565b6004355f5260126020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b3461063f57602036600319011261063f57600435610bd0816124f6565b50600d54610bdd816120b3565b610c0b575050610356604051610bf4602082612075565b5f8152604051918291602083526020830190611f8e565b8190825f937a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000811015610e2f575b50806d04ee2d6d415b85acef8100000000600a921015610e14575b662386f26fc10000811015610e00575b6305f5e100811015610def575b612710811015610de0575b6064811015610dd2575b1015610dc8575b6001830191600a6021610cb3610c9d86612097565b95610cab6040519788612075565b808752612097565b602086019690601f19013688378501015b5f1901917f30313233343536373839616263646566000000000000000000000000000000008282061a8353048015610cff57600a9091610cc4565b5050604051915f91610d10816120b3565b9060018116908115610da45750600114610d4c575b5061035693610d47928492518092825e015f815203601f198101835282612075565b610342565b909150600d5f527fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb55f905b828210610d8e575050820160200190610356610d25565b6001816020925483858901015201910190610d77565b60ff1916602080870191909152821515909202850190910192506103569050610d25565b9160010191610c88565b606460029104940193610c81565b61271060049104940193610c77565b6305f5e10060089104940193610c6c565b662386f26fc1000060109104940193610c5f565b6d04ee2d6d415b85acef810000000060209104940193610c4f565b604094507a184f03e93ff9f4daa797ed6e38ed64bf6a1f01000000000000000090049050600a610c34565b3461063f57608036600319011261063f57610e73611f62565b610e7b611f78565b6064359167ffffffffffffffff831161063f573660238401121561063f57826004013591610ea883612097565b92610eb66040519485612075565b808452366024828701011161063f576020815f926024610ee29801838801378501015260443591612385565b005b3461063f575f36600319011261063f576020600b54604051908152f35b3461063f57604036600319011261063f57610f1a611f62565b6024359081151580920361063f576001600160a01b0316908115610f8957335f52600560205260405f20825f5260205260405f2060ff1981541660ff83161790556040519081527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c3160203392a3005b50630b61174360e31b5f5260045260245ffd5b3461063f575f36600319011261063f576040515f600154610fbc816120b3565b80845290600181169081156110425750600114610fe4575b6103568361034281850382612075565b91905060015f527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6915f905b80821061102857509091508101602001610342610fd4565b919260018160209254838588010152019101909291611010565b60ff191660208086019190915291151560051b840190910191506103429050610fd4565b3461063f5761107436611fec565b61107c6124e2565b60ff600f54166112695767ffffffffffffffff8111611255576110a0600e546120b3565b601f81116111b4575b505f91601f821160011461111457817f905d981207a7d0b6c62cc46ab0be2a076d0298e4a86d0ab79882dbd01ac37378935f91611109575b508260011b905f198460031b1c191617600e555b6111046040519283928361232f565b0390a1005b9050810135846110e1565b601f198216600e5f527fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd905f5b81811061119c575093837f905d981207a7d0b6c62cc46ab0be2a076d0298e4a86d0ab79882dbd01ac373789510611183575b5050600182811b01600e556110f5565b8201355f19600385901b60f8161c191690558380611173565b83860135835560209586019560019093019201611141565b600e5f52601f820160051c7fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd01906020831061122d575b601f0160051c7fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd01905b81811061122257506110a9565b5f8155600101611215565b7fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd91506111eb565b634e487b7160e01b5f52604160045260245ffd5b63b087bbf360e01b5f5260045ffd5b3461063f5760e036600319011261063f5760043560c036602319011261063f576112a06124e2565b601054811015611415576112b6610455826120eb565b67ffffffffffffffff60408201511690814210156113f057826112d8816120eb565b6113dd576024359081815560026044359182600182015501916064359167ffffffffffffffff83169283810361063f5784549360843567ffffffffffffffff811680820361063f5760a4359163ffffffff83169384840361063f5760c4359563ffffffff87169788880361063f577f9fa21157504dc99c44e20ac28d1f880a200d1782a488f664c2d6ea6457e921069b60c09b63ffffffff60a01b19856001600160a01b031963ffffffff60a01b8d60a01b16931617166fffffffffffffffff00000000000000008760401b161763ffffffff60801b8960801b1617179055604051998a5260208a01525060408801525060608601525060808401525060a0820152a2005b634e487b7160e01b5f525f60045260245ffd5b606067ffffffffffffffff91015116906324f6551b60e01b5f5260045260245260445ffd5b6306b6e46160e31b5f5260045260245ffd5b3461063f575f36600319011261063f5760206001600160a01b0360085416604051908152f35b3461063f575f36600319011261063f57336001600160a01b0360095416036114c3576001600160a01b031960095416600955600854336001600160a01b03198216176008556001600160a01b033391167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f80a3005b63118cdaa760e01b5f523360045260245ffd5b3461063f575f36600319011261063f576114ee6124e2565b6001600160a01b0319600954166009555f6001600160a01b036008546001600160a01b03198116600855167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08280a3005b3461063f57602036600319011261063f576001600160a01b03611560611f62565b16801561157d575f526003602052602060405f2054604051908152f35b6322718ad960e21b5f525f60045260245ffd5b3461063f57602036600319011261063f5760206115ae6004356124f6565b6001600160a01b0360405191168152f35b3461063f57602036600319011261063f576115d8611f62565b6115e0612529565b6115e86124e2565b6001600160a01b03811690811561167457601154908115611665575f8080848194826011555af1611617612356565b5015611656576020917f0f2fb75cc1977a496e94837f859e957f68e26e70dc1b75d9945ee92ae57969ba83604051848152a26001600a55604051908152f35b633d2cec6f60e21b5f5260045ffd5b630686827b60e51b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b3461063f57606036600319011261063f5760043561169f611f78565b604435906bffffffffffffffffffffffff821680920361063f576116c16124e2565b6103e8821161175b57612710821161173e576001600160a01b031691821561172857604051926116f08461203d565b835260208084019283525f91825260079052604090209151905160a01b6001600160a01b0319166001600160a01b0391909116179055005b634b4f842960e11b5f526004525f60245260445ffd5b509063dfd1fc1b60e01b5f5260045260245261271060445260645ffd5b5063b9015a6160e01b5f526004526103e860245260445ffd5b3461063f5761178236611fec565b61178a6124e2565b60ff600f54166112695767ffffffffffffffff8111611255576117ae600d546120b3565b601f81116118bc575b505f91601f821160011461181c57817f6741b2fc379fad678116fe3d4d4b9a1a184ab53ba36b86ad0fa66340b1ab41ad935f91611811575b508260011b905f198460031b1c191617600d556111046040519283928361232f565b9050810135846117ef565b601f198216600d5f527fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb5905f5b8181106118a4575093837f6741b2fc379fad678116fe3d4d4b9a1a184ab53ba36b86ad0fa66340b1ab41ad951061188b575b5050600182811b01600d556110f5565b8201355f19600385901b60f8161c19169055838061187b565b83860135835560209586019560019093019201611849565b600d5f52601f820160051c7fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb5019060208310611935575b601f0160051c7fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb501905b81811061192a57506117b7565b5f815560010161191d565b7fd7b6990105719101dabeb77144f2a3385c8033acd3af97e9423a695e81ad1eb591506118f3565b3461063f575f36600319011261063f576020601154604051908152f35b3461063f57610ee261198b36611fb2565b906040519261199b602085612075565b5f8452612385565b3461063f575f36600319011261063f5760206040516103e88152f35b3461063f57604036600319011261063f576004355f52600760205260405f20546001600160a01b0381169060a01c908015611a2a575b612710611a146bffffffffffffffffffffffff60409416602435612308565b046001600160a01b038351921682526020820152f35b505060065460a081901c906001600160a01b03166119f5565b3461063f57610ee2611a5436611fb2565b91612179565b3461063f5760c036600319011261063f57611a736124e2565b601054680100000000000000008110156112555760018101601055611a97816120eb565b9190916113dd5760043591828155600260243591826001820155016044359367ffffffffffffffff85169081860361063f5782549160643567ffffffffffffffff811680820361063f5760843563ffffffff81169182820361063f5760a4359363ffffffff85169586860361063f5760209c8c9b7f83312fc8febbc31d3d350ee6f72c64a1cab34c98a97334776703e25c358c0dd99b60c09b63ffffffff60a01b19856001600160a01b031963ffffffff60a01b8d60a01b16931617166fffffffffffffffff00000000000000008760401b161763ffffffff60801b8960801b1617179055604051998a528e8a01525060408801525060608601525060808401525060a0820152a2604051908152f35b3461063f57602036600319011261063f576004355f60a0604051611bca81612059565b828152826020820152826040820152826060820152826080820152015260105481101561141557611bff61045560c0926120eb565b63ffffffff60a060405192805184526020810151602085015267ffffffffffffffff604082015116604085015267ffffffffffffffff606082015116606085015282608082015116608085015201511660a0820152f35b3461063f57604036600319011261063f57611c6f611f62565b602435611c7b816124f6565b33151580611d2f575b80611cfc575b611ce95781906001600160a01b0380851691167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9255f80a45f5260046020526001600160a01b0360405f2091166001600160a01b03198254161790555f80f35b63a9fbf51f60e01b5f523360045260245ffd5b506001600160a01b0381165f52600560205260405f206001600160a01b0333165f5260205260ff60405f20541615611c8a565b50336001600160a01b0382161415611c84565b3461063f57602036600319011261063f57600435611d5f816124f6565b505f52600460205260206001600160a01b0360405f205416604051908152f35b3461063f575f36600319011261063f576040515f5f54611d9e816120b3565b80845290600181169081156110425750600114611dc5576103568361034281850382612075565b5f8080527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563939250905b808210611e0757509091508101602001610342610fd4565b919260018160209254838588010152019101909291611def565b3461063f57604036600319011261063f57611e3a611f62565b602435906bffffffffffffffffffffffff82169081830361063f57611e5d6124e2565b6103e8821161175b576127108211611ec4576001600160a01b0316908115611eb1576020604051611e8d8161203d565b83815201526001600160a01b031660a09190911b6001600160a01b03191617600655005b635b6cc80560e11b5f525f60045260245ffd5b50636f483d0960e01b5f5260045261271060245260445ffd5b3461063f57602036600319011261063f576004359063ffffffff60e01b821680920361063f5760209163152a902d60e11b8114908115611f1f575b5015158152f35b6380ac58cd60e01b811491508115611f51575b8115611f40575b5083611f18565b6301ffc9a760e01b14905083611f39565b635b5e139f60e01b81149150611f32565b600435906001600160a01b038216820361063f57565b602435906001600160a01b038216820361063f57565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b606090600319011261063f576004356001600160a01b038116810361063f57906024356001600160a01b038116810361063f579060443590565b90602060031983011261063f5760043567ffffffffffffffff811161063f578260238201121561063f5780600401359267ffffffffffffffff841161063f576024848301011161063f576024019190565b6040810190811067ffffffffffffffff82111761125557604052565b60c0810190811067ffffffffffffffff82111761125557604052565b90601f8019910116810190811067ffffffffffffffff82111761125557604052565b67ffffffffffffffff811161125557601f01601f191660200190565b90600182811c921680156120e1575b60208310146120cd57565b634e487b7160e01b5f52602260045260245ffd5b91607f16916120c2565b6010548110156121075760105f52600360205f20910201905f90565b634e487b7160e01b5f52603260045260245ffd5b9060405161212881612059565b60a063ffffffff600283958054855260018101546020860152015467ffffffffffffffff8116604085015267ffffffffffffffff8160401c166060850152818160801c166080850152821c16910152565b91906001600160a01b0316801561072d57815f5260026020526001600160a01b0360405f2054169282331515928361226c575b6001600160a01b03935085612235575b805f52600360205260405f2060018154019055815f52600260205260405f20816001600160a01b0319825416179055857fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef5f80a41680830361221d57505050565b6364283d7b60e01b5f5260045260245260445260645ffd5b612254825f52600460205260405f206001600160a01b03198154169055565b855f52600360205260405f205f1981540190556121bc565b91929050806122b1575b15612283578282916121ac565b828461229b57637e27328960e01b5f5260045260245ffd5b63177e802f60e01b5f523360045260245260445ffd5b5033841480156122df575b806122765750825f526004602052336001600160a01b0360405f20541614612276565b50835f52600560205260405f206001600160a01b0333165f5260205260ff60405f2054166122bc565b8181029291811591840414171561231b57565b634e487b7160e01b5f52601160045260245ffd5b90918060409360208452816020850152848401375f828201840152601f01601f1916010190565b3d15612380573d9061236782612097565b916123756040519384612075565b82523d5f602084013e565b606090565b90612391838284612179565b803b61239e575b50505050565b6020916123e46001600160a01b03809316956040519586948594630a85bd0160e11b86523360048701521660248501526044840152608060648401526084830190611f8e565b03815f865af15f918161246b575b506124205750612400612356565b8051908161241b5782633250574960e11b5f5260045260245ffd5b602001fd5b7fffffffff000000000000000000000000000000000000000000000000000000001663757a42ff60e11b0161245957505f808080612398565b633250574960e11b5f5260045260245ffd5b9091506020813d6020116124c0575b8161248760209383612075565b8101031261063f57517fffffffff000000000000000000000000000000000000000000000000000000008116810361063f57905f6123f2565b3d915061247a565b9190820391821161231b57565b9190820180921161231b57565b6001600160a01b036008541633036114c357565b805f5260026020526001600160a01b0360405f205416908115612517575090565b637e27328960e01b5f5260045260245ffd5b6002600a541461253a576002600a55565b633ee5aeb560e01b5f5260045ffd" as `0x${string}`;
