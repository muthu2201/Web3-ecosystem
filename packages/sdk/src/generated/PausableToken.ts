/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const PausableTokenAbi = [
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
      }
    ],
    "stateMutability": "nonpayable"
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
    "name": "initialSupply",
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
    "name": "pauseRenounced",
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
    "name": "renouncePauseForever",
    "inputs": [],
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
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PauseRenouncedForever",
    "inputs": [],
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
    "name": "PauseAlreadyRenounced",
    "inputs": []
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

export const PausableTokenBytecode = "0x6101a0806040523461054057611e45803803809161001d8285610544565b8339810160a0828203126105405781516001600160401b0381116105405781610047918401610567565b602083015190916001600160401b03821161054057610067918401610567565b91604081015190610086608061007f606084016105bc565b92016105bc565b926040948551916100978784610544565b60018352603160f81b6020840190815281519092906001600160401b03811161045057600354600181811c91168015610536575b602082101461043257601f81116104d3575b50806020601f821160011461046f575f91610464575b508160011b915f199060031b1c1916176003555b8051906001600160401b0382116104505760045490600182811c92168015610446575b60208310146104325781601f8493116103c4575b50602090601f831160011461035e575f92610353575b50508160011b915f199060031b1c1916176004555b610172816106d9565b6101205261017f83610860565b6101405260208151910120918260e05251902080610100524660a05285519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f84528783015260608201524660808201523060a082015260a081526101ea60c082610544565b5190206080523060c0526001600160a01b031691821590818015610342575b61033357821561032457610230903361016052836101805261022a816105d0565b50610646565b506103115760ff6005541661030257600254908082018092116102ee5760207fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef915f936002558484528382528584208181540190558551908152a35161144c908161099982396080518161103f015260a051816110fc015260c05181611010015260e0518161108e015261010051816110b40152610120518161067e015261014051816106a70152610160518161034f015261018051816109470152f35b634e487b7160e01b5f52601160045260245ffd5b63d93c066560e01b5f5260045ffd5b63ec442f0560e01b5f525f60045260245ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b03811615610209565b015190505f80610154565b60045f9081528281209350601f198516905b8181106103ac5750908460019594939210610394575b505050811b01600455610169565b01515f1960f88460031b161c191690555f8080610386565b92936020600181928786015181550195019301610370565b60045f529091507f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b601f840160051c81019160208510610428575b90601f859493920160051c01905b81811061041a575061013e565b5f815584935060010161040d565b90915081906103ff565b634e487b7160e01b5f52602260045260245ffd5b91607f169161012a565b634e487b7160e01b5f52604160045260245ffd5b90508301515f6100f3565b60035f9081528181209250601f198416905b8181106104bb575090836001949392106104a3575b5050811b01600355610107565b8501515f1960f88460031b161c191690555f80610496565b9192602060018192868a015181550194019201610481565b60035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b601f830160051c8101916020841061052c575b601f0160051c01905b81811061052157506100dd565b5f8155600101610514565b909150819061050b565b90607f16906100cb565b5f80fd5b601f909101601f19168101906001600160401b0382119082101761045057604052565b81601f82011215610540578051906001600160401b038211610450576040519261059b601f8401601f191660200185610544565b8284526020838301011161054057815f9260208093018386015e8301015290565b51906001600160a01b038216820361054057565b6001600160a01b0381165f9081525f516020611e255f395f51905f52602052604090205460ff16610641576001600160a01b03165f8181525f516020611e255f395f51905f5260205260408120805460ff191660011790553391905f516020611de55f395f51905f528180a4600190565b505f90565b6001600160a01b0381165f9081525f516020611e055f395f51905f52602052604090205460ff16610641576001600160a01b03165f8181525f516020611e055f395f51905f5260205260408120805460ff191660011790553391907f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a905f516020611de55f395f51905f529080a4600190565b908151602081105f14610753575090601f815111610713576020815191015160208210610704571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b6001600160401b03811161045057600654600181811c91168015610856575b602082101461043257601f8111610823575b50602092601f82116001146107c257928192935f926107b7575b50508160011b915f199060031b1c19161760065560ff90565b015190505f8061079e565b601f1982169360065f52805f20915f5b86811061080b57508360019596106107f3575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f80806107e5565b919260206001819286850151815501940192016107d2565b60065f52601f60205f20910160051c810190601f830160051c015b81811061084b5750610784565b5f815560010161083e565b90607f1690610772565b908151602081105f1461088b575090601f815111610713576020815191015160208210610704571790565b6001600160401b03811161045057600754600181811c9116801561098e575b602082101461043257601f811161095b575b50602092601f82116001146108fa57928192935f926108ef575b50508160011b915f199060031b1c19161760075560ff90565b015190505f806108d6565b601f1982169360075f52805f20915f5b868110610943575083600195961061092b575b505050811b0160075560ff90565b01515f1960f88460031b161c191690555f808061091d565b9192602060018192868501518155019401920161090a565b60075f52601f60205f20910160051c810190601f830160051c015b81811061098357506108bc565b5f8155600101610976565b90607f16906108aa56fe6080806040526004361015610012575f80fd5b5f3560e01c90816301ffc9a714610b8e5750806306fdde0314610ae9578063095ea7b314610ac357806318160ddd14610aa657806323b872dd14610a6e578063248a9ca314610a435780632a28b85014610a215780632f2ff15d146109e3578063313ce567146109c85780633644e515146109ae57806336568abe1461096a578063378dc3dc146109305780633f4ba83a146108d957806342966c68146108bc5780635c975abb1461089a57806370a082311461086357806379cc6790146108335780637aa77f29146107f95780637ecebe00146107c15780638456cb591461075e57806384b0196e1461066657806391d148541461061c57806395d89b411461053a578063a217fddf14610520578063a9059cbb146104ef578063d505accf146103b8578063d547741f14610373578063d5f3948814610330578063dd62ed3e146102dc578063e1df740b146101dc578063e63ab1e9146101a25763ef7773b01461017c575f80fd5b3461019e575f36600319011261019e576020610196610d20565b604051908152f35b5f80fd5b3461019e575f36600319011261019e5760206040517f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a8152f35b3461019e575f36600319011261019e57335f9081527fec8156718a8372b1db44bb411437d0870f3e3790d4a08526d024ce1b0b668f6b602052604090205460ff16156102c557600a5460ff81166102b65760ff1916600117600a5560055460ff81168061026a575b7f5ac2472de16d7d66cb1e4045f6b4be3bf43e697a3b362af55a1b42a1301788f65f80a1005b156102a75760ff19166005557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa6020604051338152a18080610244565b638dfc202b60e01b5f5260045ffd5b632ae2870b60e21b5f5260045ffd5b63e2517d3f60e01b5f52336004525f60245260445ffd5b3461019e57604036600319011261019e576102f5610c05565b6001600160a01b03610305610c1b565b91165f5260016020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b3461019e575f36600319011261019e5760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b3461019e57604036600319011261019e576103b6600435610392610c1b565b906103b16103ac825f526009602052600160405f20015490565b610f36565b611122565b005b3461019e5760e036600319011261019e576103d1610c05565b6103d9610c1b565b604435906064359260843560ff8116810361019e578442116104dc576104b26104a96001600160a01b039283851697885f52600860205260405f20908154916001830190556040519060208201927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c984528b6040840152878a1660608401528a608084015260a083015260c082015260c0815261047760e082610cea565b519020610482611006565b906040519161190160f01b83526002830152602282015260c43591604260a435922061134b565b909291926113d8565b168481036104c557506103b69350611233565b84906325c0072360e11b5f5260045260245260445ffd5b8463313c898160e11b5f5260045260245ffd5b3461019e57604036600319011261019e5761051561050b610c05565b6024359033610e02565b602060405160018152f35b3461019e575f36600319011261019e5760206040515f8152f35b3461019e575f36600319011261019e576040515f60045461055a81610c31565b80845290600181169081156105f8575060011461059a575b6105968361058281850382610cea565b604051918291602083526020830190610be1565b0390f35b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b8082106105de57509091508101602001610582610572565b9192600181602092548385880101520191019092916105c6565b60ff191660208086019190915291151560051b840190910191506105829050610572565b3461019e57604036600319011261019e57610635610c1b565b6004355f5260096020526001600160a01b0360405f2091165f52602052602060ff60405f2054166040519015158152f35b3461019e575f36600319011261019e576107026106a27f00000000000000000000000000000000000000000000000000000000000000006112b1565b6106cb7f0000000000000000000000000000000000000000000000000000000000000000611314565b6020610710604051926106de8385610cea565b5f84525f368137604051958695600f60f81b875260e08588015260e0870190610be1565b908582036040870152610be1565b4660608501523060808501525f60a085015283810360c08501528180845192838152019301915f5b82811061074757505050500390f35b835185528695509381019392810192600101610738565b3461019e575f36600319011261019e57610776610ec7565b60ff600a54166102b657610788611296565b600160ff1960055416176005557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586020604051338152a1005b3461019e57602036600319011261019e576001600160a01b036107e2610c05565b165f526008602052602060405f2054604051908152f35b3461019e575f36600319011261019e5760206040517fe2f2cdaaddff03d7d7d22650029dc1656c10647671bd58fe6094e2151ade0ff88152f35b3461019e57604036600319011261019e576103b661084f610c05565b6024359061085e823383610d33565b6111a7565b3461019e57602036600319011261019e576001600160a01b03610884610c05565b165f525f602052602060405f2054604051908152f35b3461019e575f36600319011261019e57602060ff600554166040519015158152f35b3461019e57602036600319011261019e576103b6600435336111a7565b3461019e575f36600319011261019e576108f1610ec7565b60055460ff8116156102a75760ff19166005557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa6020604051338152a1005b3461019e575f36600319011261019e5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b3461019e57604036600319011261019e57610983610c1b565b336001600160a01b0382160361099f576103b690600435611122565b63334bd91960e11b5f5260045ffd5b3461019e575f36600319011261019e576020610196611006565b3461019e575f36600319011261019e57602060405160128152f35b3461019e57604036600319011261019e576103b6600435610a02610c1b565b90610a1c6103ac825f526009602052600160405f20015490565b610f77565b3461019e575f36600319011261019e57602060ff600a54166040519015158152f35b3461019e57602036600319011261019e5760206101966004355f526009602052600160405f20015490565b3461019e57606036600319011261019e57610515610a8a610c05565b610a92610c1b565b60443591610aa1833383610d33565b610e02565b3461019e575f36600319011261019e576020600254604051908152f35b3461019e57604036600319011261019e57610515610adf610c05565b6024359033611233565b3461019e575f36600319011261019e576040515f600354610b0981610c31565b80845290600181169081156105f85750600114610b30576105968361058281850382610cea565b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b808210610b7457509091508101602001610582610572565b919260018160209254838588010152019101909291610b5c565b3461019e57602036600319011261019e576004359063ffffffff60e01b821680920361019e57602091637965db0b60e01b8114908115610bd0575b5015158152f35b6301ffc9a760e01b14905083610bc9565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b600435906001600160a01b038216820361019e57565b602435906001600160a01b038216820361019e57565b90600182811c92168015610c5f575b6020831014610c4b57565b634e487b7160e01b5f52602260045260245ffd5b91607f1691610c40565b5f9291815491610c7883610c31565b8083529260018116908115610ccd5750600114610c9457505050565b5f9081526020812093945091925b838310610cb3575060209250010190565b600181602092949394548385870101520191019190610ca2565b915050602093945060ff929192191683830152151560051b010190565b90601f8019910116810190811067ffffffffffffffff821117610d0c57604052565b634e487b7160e01b5f52604160045260245ffd5b60ff600a5416610d2f57608290565b5f90565b6001600160a01b03909291921691825f52600160205260405f206001600160a01b0382165f5260205260405f2054925f198410610d71575b50505050565b828410610dde578015610dcb576001600160a01b03821615610db8575f5260016020526001600160a01b0360405f2091165f5260205260405f20910390555f808080610d6b565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b506001600160a01b038391637dc7a0d960e11b5f521660045260245260445260645ffd5b6001600160a01b0316908115610eb4576001600160a01b0316918215610ea157610e2a611296565b815f525f60205260405f2054818110610e8857817fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92602092855f525f84520360405f2055845f525f825260405f20818154019055604051908152a3565b8263391434e360e21b5f5260045260245260445260645ffd5b63ec442f0560e01b5f525f60045260245ffd5b634b637e8f60e11b5f525f60045260245ffd5b335f9081527f84574a31e2f767388bfa57bc81ff2590df95d3022c04c363cca3e37ee9608631602052604090205460ff1615610eff57565b63e2517d3f60e01b5f52336004527f65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a60245260445ffd5b805f52600960205260405f206001600160a01b0333165f5260205260ff60405f20541615610f615750565b63e2517d3f60e01b5f523360045260245260445ffd5b805f52600960205260405f206001600160a01b0383165f5260205260ff60405f205416155f1461100057805f52600960205260405f206001600160a01b0383165f5260205260405f20600160ff198254161790556001600160a01b03339216907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d5f80a4600190565b50505f90565b6001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000163014806110f9575b15611061577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a081526110f360c082610cea565b51902090565b507f00000000000000000000000000000000000000000000000000000000000000004614611038565b805f52600960205260405f206001600160a01b0383165f5260205260ff60405f2054165f1461100057805f52600960205260405f206001600160a01b0383165f5260205260405f2060ff1981541690556001600160a01b03339216907ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b5f80a4600190565b9091906001600160a01b03168015610eb4576111c1611296565b805f525f60205260405f2054838110611219576020845f94957fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef938587528684520360408620558060025403600255604051908152a3565b915063391434e360e21b5f5260045260245260445260645ffd5b6001600160a01b0316908115610dcb576001600160a01b0316918215610db85760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591835f526001825260405f20855f5282528060405f2055604051908152a3565b60ff600554166112a257565b63d93c066560e01b5f5260045ffd5b60ff81146112f75760ff811690601f82116112e857604051916112d5604084610cea565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b506040516113118161130a816006610c69565b0382610cea565b90565b60ff81146113385760ff811690601f82116112e857604051916112d5604084610cea565b506040516113118161130a816007610c69565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084116113cd579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa156113c2575f516001600160a01b038116156113b857905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b600481101561143857806113ea575050565b600181036114015763f645eedf60e01b5f5260045ffd5b6002810361141c575063fce698f760e01b5f5260045260245ffd5b6003146114265750565b6335e2f38360e21b5f5260045260245ffd5b634e487b7160e01b5f52602160045260245ffd2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d84574a31e2f767388bfa57bc81ff2590df95d3022c04c363cca3e37ee9608631ec8156718a8372b1db44bb411437d0870f3e3790d4a08526d024ce1b0b668f6b" as `0x${string}`;
