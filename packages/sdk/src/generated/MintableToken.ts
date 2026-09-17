/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const MintableTokenAbi = [
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

export const MintableTokenBytecode = "0x6101a0806040523461058457611deb803803809161001d8285610588565b8339810160c0828203126105845781516001600160401b03811161058457816100479184016105ab565b602083015190916001600160401b038211610584576100679184016105ab565b91604081015160608201519161008b60a061008460808401610600565b9201610600565b9360409586519161009c8884610588565b60018352603160f81b6020840190815281519092906001600160401b03811161049457600354600181811c9116801561057a575b602082101461047657601f8111610517575b50806020601f82116001146104b3575f916104a8575b508160011b915f199060031b1c1916176003555b8051906001600160401b0382116104945760045490600182811c9216801561048a575b60208310146104765781601f849311610408575b50602090601f83116001146103a2575f92610397575b50508160011b915f199060031b1c1916176004555b841561038457846080526101818161071d565b6101405261018e836108a4565b610160526020815191012091826101005251902080610120524660c05286519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f84528883015260608201524660808201523060a082015260a081526101fa60c082610588565b51902060a0523060e0526001600160a01b031692831591828015610373575b6103645783156103555783116103465761024190336101805261023b81610614565b5061068a565b50610333576002549080820180921161031f5760207fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef915f936002558484528382528584208181540190558551908152a360805160025481811161030a5782516113ae90816109dd82396080518181816108bf01526109e9015260a05181610fc4015260c05181611081015260e05181610f9501526101005181611013015261012051816110390152610140518161062b01526101605181610654015261018051816102a00152f35b63279e7e1560e21b5f5260045260245260445ffd5b634e487b7160e01b5f52601160045260245ffd5b63ec442f0560e01b5f525f60045260245ffd5b6338df86a360e11b5f5260045ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b03821615610219565b63392e1e2760e01b5f525f60045260245ffd5b015190505f80610159565b60045f9081528281209350601f198516905b8181106103f057509084600195949392106103d8575b505050811b0160045561016e565b01515f1960f88460031b161c191690555f80806103ca565b929360206001819287860151815501950193016103b4565b60045f529091507f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b601f840160051c8101916020851061046c575b90601f859493920160051c01905b81811061045e5750610143565b5f8155849350600101610451565b9091508190610443565b634e487b7160e01b5f52602260045260245ffd5b91607f169161012f565b634e487b7160e01b5f52604160045260245ffd5b90508301515f6100f8565b60035f9081528181209250601f198416905b8181106104ff575090836001949392106104e7575b5050811b0160035561010c565b8501515f1960f88460031b161c191690555f806104da565b9192602060018192868a0151815501940192016104c5565b60035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b601f830160051c81019160208410610570575b601f0160051c01905b81811061056557506100e2565b5f8155600101610558565b909150819061054f565b90607f16906100d0565b5f80fd5b601f909101601f19168101906001600160401b0382119082101761049457604052565b81601f82011215610584578051906001600160401b03821161049457604051926105df601f8401601f191660200185610588565b8284526020838301011161058457815f9260208093018386015e8301015290565b51906001600160a01b038216820361058457565b6001600160a01b0381165f9081525f516020611dcb5f395f51905f52602052604090205460ff16610685576001600160a01b03165f8181525f516020611dcb5f395f51905f5260205260408120805460ff191660011790553391905f516020611d8b5f395f51905f528180a4600190565b505f90565b6001600160a01b0381165f9081525f516020611dab5f395f51905f52602052604090205460ff16610685576001600160a01b03165f8181525f516020611dab5f395f51905f5260205260408120805460ff191660011790553391907f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6905f516020611d8b5f395f51905f529080a4600190565b908151602081105f14610797575090601f815111610757576020815191015160208210610748571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b6001600160401b03811161049457600554600181811c9116801561089a575b602082101461047657601f8111610867575b50602092601f821160011461080657928192935f926107fb575b50508160011b915f199060031b1c19161760055560ff90565b015190505f806107e2565b601f1982169360055f52805f20915f5b86811061084f5750836001959610610837575b505050811b0160055560ff90565b01515f1960f88460031b161c191690555f8080610829565b91926020600181928685015181550194019201610816565b60055f52601f60205f20910160051c810190601f830160051c015b81811061088f57506107c8565b5f8155600101610882565b90607f16906107b6565b908151602081105f146108cf575090601f815111610757576020815191015160208210610748571790565b6001600160401b03811161049457600654600181811c911680156109d2575b602082101461047657601f811161099f575b50602092601f821160011461093e57928192935f92610933575b50508160011b915f199060031b1c19161760065560ff90565b015190505f8061091a565b601f1982169360065f52805f20915f5b868110610987575083600195961061096f575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f8080610961565b9192602060018192868501518155019401920161094e565b60065f52601f60205f20910160051c810190601f830160051c015b8181106109c75750610900565b5f81556001016109ba565b90607f16906108ee56fe6080806040526004361015610012575f80fd5b5f3560e01c90816301ffc9a714610bb05750806306fdde0314610b0b578063095ea7b314610ae557806318160ddd14610ac857806323b872dd14610a90578063248a9ca314610a655780632f2ff15d14610a27578063313ce56714610a0c578063355274ea146109d25780633644e515146109b057806336568abe1461096c57806340c10f191461080157806342966c68146107e457806370a08231146107ad57806379cc67901461077d5780637aa77f29146107435780637ecebe001461070b57806384b0196e1461061357806391d14854146105c957806395d89b41146104e7578063a217fddf146104cd578063a9059cbb1461049c578063af9dc1e11461047a578063d505accf14610343578063d539139314610309578063d547741f146102c4578063d5f3948814610281578063dd62ed3e1461022d578063ef7773b0146101fa5763f15de7aa14610166575f80fd5b346101f6575f3660031901126101f657335f9081527f5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c7602052604090205460ff16156101df57600160ff1960095416176009557fc32d1c2452e5576cdc0dafad8e664c67f73998d0cb50411db02e7d704ca24ae25f80a1005b63e2517d3f60e01b5f52336004525f60245260445ffd5b5f80fd5b346101f6575f3660031901126101f65761010060ff6009541615610224575b602090604051908152f35b50610181610219565b346101f65760403660031901126101f657610246610c27565b6001600160a01b03610256610c3d565b91165f5260016020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b346101f6575f3660031901126101f65760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b346101f65760403660031901126101f6576103076004356102e3610c3d565b906103026102fd825f526008602052600160405f20015490565b610ebb565b6110a7565b005b346101f6575f3660031901126101f65760206040517f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a68152f35b346101f65760e03660031901126101f65761035c610c27565b610364610c3d565b604435906064359260843560ff811681036101f6578442116104675761043d6104346001600160a01b039283851697885f52600760205260405f20908154916001830190556040519060208201927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c984528b6040840152878a1660608401528a608084015260a083015260c082015260c0815261040260e082610d0c565b51902061040d610f8b565b906040519161190160f01b83526002830152602282015260c43591604260a43592206112ad565b9092919261133a565b16848103610450575061030793506111b0565b84906325c0072360e11b5f5260045260245260445ffd5b8463313c898160e11b5f5260045260245ffd5b346101f6575f3660031901126101f657602060ff600954166040519015158152f35b346101f65760403660031901126101f6576104c26104b8610c27565b6024359033610e11565b602060405160018152f35b346101f6575f3660031901126101f65760206040515f8152f35b346101f6575f3660031901126101f6576040515f60045461050781610c53565b80845290600181169081156105a55750600114610547575b6105438361052f81850382610d0c565b604051918291602083526020830190610c03565b0390f35b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b80821061058b5750909150810160200161052f61051f565b919260018160209254838588010152019101909291610573565b60ff191660208086019190915291151560051b8401909101915061052f905061051f565b346101f65760403660031901126101f6576105e2610c3d565b6004355f5260086020526001600160a01b0360405f2091165f52602052602060ff60405f2054166040519015158152f35b346101f6575f3660031901126101f6576106af61064f7f0000000000000000000000000000000000000000000000000000000000000000611213565b6106787f0000000000000000000000000000000000000000000000000000000000000000611276565b60206106bd6040519261068b8385610d0c565b5f84525f368137604051958695600f60f81b875260e08588015260e0870190610c03565b908582036040870152610c03565b4660608501523060808501525f60a085015283810360c08501528180845192838152019301915f5b8281106106f457505050500390f35b8351855286955093810193928101926001016106e5565b346101f65760203660031901126101f6576001600160a01b0361072c610c27565b165f526007602052602060405f2054604051908152f35b346101f6575f3660031901126101f65760206040517feef45041081068f9ace279071e42ce4ac5aad198eefd3c33d70afa3bfdf06b588152f35b346101f65760403660031901126101f657610307610799610c27565b602435906107a8823383610d42565b61112c565b346101f65760203660031901126101f6576001600160a01b036107ce610c27565b165f525f602052602060405f2054604051908152f35b346101f65760203660031901126101f6576103076004353361112c565b346101f65760403660031901126101f65761081a610c27565b335f9081527f51a495916474fe1a0c0fcfb65a8a97682b84a054118858cdd1f5dfd7fc0919eb6020526040902054602435919060ff16156109355760ff60095416610926576001600160a01b031690811561091357600254908082018092116108ff5760207fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef915f9360025584845283825260408420818154019055604051908152a37f00000000000000000000000000000000000000000000000000000000000000006002548181116108ea57005b63279e7e1560e21b5f5260045260245260445ffd5b634e487b7160e01b5f52601160045260245ffd5b63ec442f0560e01b5f525f60045260245ffd5b636f93435960e01b5f5260045ffd5b63e2517d3f60e01b5f52336004527f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a660245260445ffd5b346101f65760403660031901126101f657610985610c3d565b336001600160a01b038216036109a157610307906004356110a7565b63334bd91960e11b5f5260045ffd5b346101f6575f3660031901126101f65760206109ca610f8b565b604051908152f35b346101f6575f3660031901126101f65760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b346101f6575f3660031901126101f657602060405160128152f35b346101f65760403660031901126101f657610307600435610a46610c3d565b90610a606102fd825f526008602052600160405f20015490565b610efc565b346101f65760203660031901126101f65760206109ca6004355f526008602052600160405f20015490565b346101f65760603660031901126101f6576104c2610aac610c27565b610ab4610c3d565b60443591610ac3833383610d42565b610e11565b346101f6575f3660031901126101f6576020600254604051908152f35b346101f65760403660031901126101f6576104c2610b01610c27565b60243590336111b0565b346101f6575f3660031901126101f6576040515f600354610b2b81610c53565b80845290600181169081156105a55750600114610b52576105438361052f81850382610d0c565b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b808210610b965750909150810160200161052f61051f565b919260018160209254838588010152019101909291610b7e565b346101f65760203660031901126101f6576004359063ffffffff60e01b82168092036101f657602091637965db0b60e01b8114908115610bf2575b5015158152f35b6301ffc9a760e01b14905083610beb565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b600435906001600160a01b03821682036101f657565b602435906001600160a01b03821682036101f657565b90600182811c92168015610c81575b6020831014610c6d57565b634e487b7160e01b5f52602260045260245ffd5b91607f1691610c62565b5f9291815491610c9a83610c53565b8083529260018116908115610cef5750600114610cb657505050565b5f9081526020812093945091925b838310610cd5575060209250010190565b600181602092949394548385870101520191019190610cc4565b915050602093945060ff929192191683830152151560051b010190565b90601f8019910116810190811067ffffffffffffffff821117610d2e57604052565b634e487b7160e01b5f52604160045260245ffd5b6001600160a01b03909291921691825f52600160205260405f206001600160a01b0382165f5260205260405f2054925f198410610d80575b50505050565b828410610ded578015610dda576001600160a01b03821615610dc7575f5260016020526001600160a01b0360405f2091165f5260205260405f20910390555f808080610d7a565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b506001600160a01b038391637dc7a0d960e11b5f521660045260245260445260645ffd5b6001600160a01b0316908115610ea8576001600160a01b031691821561091357815f525f60205260405f2054818110610e8f57817fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92602092855f525f84520360405f2055845f525f825260405f20818154019055604051908152a3565b8263391434e360e21b5f5260045260245260445260645ffd5b634b637e8f60e11b5f525f60045260245ffd5b805f52600860205260405f206001600160a01b0333165f5260205260ff60405f20541615610ee65750565b63e2517d3f60e01b5f523360045260245260445ffd5b805f52600860205260405f206001600160a01b0383165f5260205260ff60405f205416155f14610f8557805f52600860205260405f206001600160a01b0383165f5260205260405f20600160ff198254161790556001600160a01b03339216907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d5f80a4600190565b50505f90565b6001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001630148061107e575b15610fe6577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a0815261107860c082610d0c565b51902090565b507f00000000000000000000000000000000000000000000000000000000000000004614610fbd565b805f52600860205260405f206001600160a01b0383165f5260205260ff60405f2054165f14610f8557805f52600860205260405f206001600160a01b0383165f5260205260405f2060ff1981541690556001600160a01b03339216907ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b5f80a4600190565b9091906001600160a01b03168015610ea857805f525f60205260405f2054838110611196576020845f94957fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef938587528684520360408620558060025403600255604051908152a3565b915063391434e360e21b5f5260045260245260445260645ffd5b6001600160a01b0316908115610dda576001600160a01b0316918215610dc75760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591835f526001825260405f20855f5282528060405f2055604051908152a3565b60ff81146112595760ff811690601f821161124a5760405191611237604084610d0c565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b506040516112738161126c816005610c8b565b0382610d0c565b90565b60ff811461129a5760ff811690601f821161124a5760405191611237604084610d0c565b506040516112738161126c816006610c8b565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841161132f579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa15611324575f516001600160a01b0381161561131a57905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b600481101561139a578061134c575050565b600181036113635763f645eedf60e01b5f5260045ffd5b6002810361137e575063fce698f760e01b5f5260045260245ffd5b6003146113885750565b6335e2f38360e21b5f5260045260245ffd5b634e487b7160e01b5f52602160045260245ffd2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d51a495916474fe1a0c0fcfb65a8a97682b84a054118858cdd1f5dfd7fc0919eb5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c7" as `0x${string}`;
