/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const TaxTokenAbi = [
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
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "taxRecipient_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "maxTaxBps_",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "buyTaxBps_",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "sellTaxBps_",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ABSOLUTE_MAX_TAX_BPS",
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
    "name": "buyTaxBps",
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
    "name": "isAmmPair",
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
    "name": "isExcludedFromTax",
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
    "name": "maxTaxBps",
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
    "name": "renounceOwnership",
    "inputs": [],
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
    "name": "sellTaxBps",
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
    "name": "setAmmPair",
    "inputs": [
      {
        "name": "pair",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "isPair",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setExcludedFromTax",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "excluded",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTaxRecipient",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTaxes",
    "inputs": [
      {
        "name": "newBuyTaxBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "newSellTaxBps",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "taxBpsFor",
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
    "name": "taxRecipient",
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
    "type": "event",
    "name": "AmmPairUpdated",
    "inputs": [
      {
        "name": "pair",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "isPair",
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
    "name": "EIP712DomainChanged",
    "inputs": [],
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
    "name": "TaxExclusionUpdated",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "excluded",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaxRecipientUpdated",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaxesLowered",
    "inputs": [
      {
        "name": "buyTaxBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "sellTaxBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
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
    "name": "TaxAboveCap",
    "inputs": [
      {
        "name": "requested",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "cap",
        "type": "uint16",
        "internalType": "uint16"
      }
    ]
  },
  {
    "type": "error",
    "name": "TaxCannotIncrease",
    "inputs": [
      {
        "name": "requested",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "current",
        "type": "uint16",
        "internalType": "uint16"
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

export const TaxTokenBytecode = "0x6101c08060405234610647576121d3803803809161001d828561064b565b83398101610120828203126106475781516001600160401b038111610647578161004891840161066e565b602083015190916001600160401b0382116106475761006891840161066e565b9160408101519061007b606082016106c3565b92610088608083016106c3565b9161009560a082016106c3565b6100a160c083016106d7565b936100bb6101006100b460e086016106d7565b94016106d7565b936040988951916100cc8b8461064b565b60018352603160f81b6020840190815281519092906001600160401b03811161055757600354600181811c9116801561063d575b602082101461053957601f81116105da575b50806020601f8211600114610576575f9161056b575b508160011b915f199060031b1c1916176003555b8051906001600160401b0382116105575760045490600182811c9216801561054d575b60208310146105395781601f8493116104cb575b50602090601f8311600114610465575f9261045a575b50508160011b915f199060031b1c1916176004555b6101a7816106e6565b610120526101b48361086d565b6101405260208151910120918260e05251902080610100524660a05289519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f84528b83015260608201524660808201523060a082015260a0815261021f60c08261064b565b5190206080523060c0526001600160a01b03169182156104475760085490836001600160a01b0383167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f80a36001600160a01b038816801596909590878015610440575b801561042f575b6104205788156104115761ffff81166103e881116103f95761ffff84168181116103e4575061ffff83168181116103e457505033610180526101a08990526101605260a09190911b61ffff60a01b166001600160c01b031990921684179190911760b09190911b61ffff60b01b1617600855600980546001600160a01b0319166001600160a01b039290921691821790555f918252600b602052868220805460ff199081166001908117909255918352878320805483168217905592825290869020805490911690911790556103d157610364916109a5565b5161160a9081610ba9823960805181611124015260a051816111e1015260c051816110f5015260e05181611173015261010051816111990152610120518161071a0152610140518161074301526101605181610b240152610180518161032401526101a05181610b7c0152f35b63ec442f0560e01b5f525f60045260245ffd5b632a5a5c7f60e21b5f5260045260245260445ffd5b632a5a5c7f60e21b5f526004526103e860245260445ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b0385161561028b565b505f610284565b631e4fbdf760e01b5f525f60045260245ffd5b015190505f80610189565b60045f9081528281209350601f198516905b8181106104b3575090846001959493921061049b575b505050811b0160045561019e565b01515f1960f88460031b161c191690555f808061048d565b92936020600181928786015181550195019301610477565b60045f529091507f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b601f840160051c8101916020851061052f575b90601f859493920160051c01905b8181106105215750610173565b5f8155849350600101610514565b9091508190610506565b634e487b7160e01b5f52602260045260245ffd5b91607f169161015f565b634e487b7160e01b5f52604160045260245ffd5b90508301515f610128565b60035f9081528181209250601f198416905b8181106105c2575090836001949392106105aa575b5050811b0160035561013c565b8501515f1960f88460031b161c191690555f8061059d565b9192602060018192868a015181550194019201610588565b60035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b601f830160051c81019160208410610633575b601f0160051c01905b8181106106285750610112565b5f815560010161061b565b9091508190610612565b90607f1690610100565b5f80fd5b601f909101601f19168101906001600160401b0382119082101761055757604052565b81601f82011215610647578051906001600160401b03821161055757604051926106a2601f8401601f19166020018561064b565b8284526020838301011161064757815f9260208093018386015e8301015290565b51906001600160a01b038216820361064757565b519061ffff8216820361064757565b908151602081105f14610760575090601f815111610720576020815191015160208210610711571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b6001600160401b03811161055757600554600181811c91168015610863575b602082101461053957601f8111610830575b50602092601f82116001146107cf57928192935f926107c4575b50508160011b915f199060031b1c19161760055560ff90565b015190505f806107ab565b601f1982169360055f52805f20915f5b8681106108185750836001959610610800575b505050811b0160055560ff90565b01515f1960f88460031b161c191690555f80806107f2565b919260206001819286850151815501940192016107df565b60055f52601f60205f20910160051c810190601f830160051c015b8181106108585750610791565b5f815560010161084b565b90607f169061077f565b908151602081105f14610898575090601f815111610720576020815191015160208210610711571790565b6001600160401b03811161055757600654600181811c9116801561099b575b602082101461053957601f8111610968575b50602092601f821160011461090757928192935f926108fc575b50508160011b915f199060031b1c19161760065560ff90565b015190505f806108e3565b601f1982169360065f52805f20915f5b8681106109505750836001959610610938575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f808061092a565b91926020600181928685015181550194019201610917565b60065f52601f60205f20910160051c810190601f830160051c015b81811061099057506108c9565b5f8155600101610983565b90607f16906108b7565b9061ffff6109b3835f610a35565b1680158015610a2d575b610a22578082029082820414821517156109f157612710900480610a05575b81039081116109f1576109ef915f610aee565b565b634e487b7160e01b5f52601160045260245ffd5b600954610a1d9082906001600160a01b03165f610aee565b6109dc565b506109ef915f610aee565b5081156109bd565b6001600160a01b031680158015610add575b610ab657805f52600b60205260ff60405f2054168015610abc575b610ab6575f52600a60205260ff60405f205416610aa8576001600160a01b03165f908152600a602052604090205460ff16610a9b575f90565b61ffff60085460b01c1690565b5061ffff60085460a01c1690565b50505f90565b506001600160a01b0382165f908152600b602052604090205460ff16610a62565b506001600160a01b03821615610a47565b6001600160a01b03169081610b56576002548381018091116109f1575f5160206121b35f395f51905f52916020916002555b6001600160a01b03169384610b415780600254036002555b604051908152a3565b845f525f825260405f20818154019055610b38565b815f525f60205260405f2054838110610b8d575f5160206121b35f395f51905f529184602092855f525f84520360405f2055610b20565b91905063391434e360e21b5f5260045260245260445260645ffdfe6080806040526004361015610012575f80fd5b5f3560e01c90816306fdde0314610cdf57508063095ea7b314610cb95780630a65692314610c4d57806318160ddd14610c3057806323b872dd14610bf85780632b79001314610bdc578063313ce56714610bc15780633644e51514610b9f578063378dc3dc14610b6557806342966c6814610b48578063596b7b0014610b0a57806370528514146109eb57806370a08231146109b4578063715018a61461094e578063737ea06e1461092857806378e3079e1461089c57806379cc67901461086c5780637aa77f29146108325780637ecebe00146107fa57806384b0196e146107025780638da5cb5b146106dc5780639191a9c71461069f57806395d89b41146105bd578063a9059cbb1461058c578063c2ed286b14610506578063c473413a146104e2578063cb4ca631146104a5578063cffd129c14610481578063d505accf14610348578063d5f3948814610305578063dd62ed3e146102b1578063e763535c14610279578063ef7773b0146102285763f2fde38b14610192575f80fd5b34610224576020366003190112610224576001600160a01b036101b3610da5565b6101bb610fa4565b168015610211576001600160a01b036008548273ffffffffffffffffffffffffffffffffffffffff19821617600855167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f80a3005b631e4fbdf760e01b5f525f60045260245ffd5b5f80fd5b34610224575f36600319011261022457608060085461ffff8160a01c161590811591610268575b50610260575b602090604051908152f35b506084610255565b61ffff915060b01c1615158261024f565b346102245760403660031901126102245760206102a5610297610da5565b61029f610dbb565b90610eef565b61ffff60405191168152f35b34610224576040366003190112610224576102ca610da5565b6001600160a01b036102da610dbb565b91165f5260016020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b34610224575f3660031901126102245760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b346102245760e036600319011261022457610361610da5565b610369610dbb565b604435906064359260843560ff811681036102245784421161046e576104426104396001600160a01b039283851697885f52600760205260405f20908154916001830190556040519060208201927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c984528b6040840152878a1660608401528a608084015260a083015260c082015260c0815261040760e082610eb9565b5190206104126110eb565b906040519161190160f01b83526002830152602282015260c43591604260a4359220611420565b909291926114ad565b1684810361045757506104559350611220565b005b84906325c0072360e11b5f5260045260245260445ffd5b8463313c898160e11b5f5260045260245ffd5b34610224575f36600319011261022457602061ffff60085460b01c16604051908152f35b34610224576020366003190112610224576001600160a01b036104c6610da5565b165f52600b602052602060ff60405f2054166040519015158152f35b34610224575f36600319011261022457602061ffff60085460a01c16604051908152f35b34610224576001600160a01b0361051c36610dd1565b9190610526610fa4565b1690811561057d5760207f057dc60ecf6df48e0f4af40ef0f88074d41e0ce54a1fef20925cd23c6de0386091835f52600b82526105728160405f209060ff801983541691151516179055565b6040519015158152a2005b63d92e233d60e01b5f5260045ffd5b34610224576040366003190112610224576105b26105a8610da5565b602435903361109a565b602060405160018152f35b34610224575f366003190112610224576040515f6004546105dd81610e00565b808452906001811690811561067b575060011461061d575b6106198361060581850382610eb9565b604051918291602083526020830190610d81565b0390f35b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b808210610661575090915081016020016106056105f5565b919260018160209254838588010152019101909291610649565b60ff191660208086019190915291151560051b8401909101915061060590506105f5565b34610224576020366003190112610224576001600160a01b036106c0610da5565b165f52600a602052602060ff60405f2054166040519015158152f35b34610224575f3660031901126102245760206001600160a01b0360085416604051908152f35b34610224575f3660031901126102245761079e61073e7f0000000000000000000000000000000000000000000000000000000000000000611386565b6107677f00000000000000000000000000000000000000000000000000000000000000006113e9565b60206107ac6040519261077a8385610eb9565b5f84525f368137604051958695600f60f81b875260e08588015260e0870190610d81565b908582036040870152610d81565b4660608501523060808501525f60a085015283810360c08501528180845192838152019301915f5b8281106107e357505050500390f35b8351855286955093810193928101926001016107d4565b34610224576020366003190112610224576001600160a01b0361081b610da5565b165f526007602052602060405f2054604051908152f35b34610224575f3660031901126102245760206040517f25380f0e27a016ecfc61536ea8c2cfe5473b4983c36deccc6a417860333bcb888152f35b3461022457604036600319011261022457610455610888610da5565b60243590610897823383610fcb565b611207565b34610224576020366003190112610224576001600160a01b036108bd610da5565b6108c5610fa4565b16801561057d578073ffffffffffffffffffffffffffffffffffffffff196009541617600955805f52600b60205260405f20600160ff198254161790557fcb5639215577b3eba6150c2a74d8de8ea5885c176e29e2e66a7551cc15b7a7cf5f80a2005b34610224575f3660031901126102245760206001600160a01b0360095416604051908152f35b34610224575f36600319011261022457610966610fa4565b5f6001600160a01b0360085473ffffffffffffffffffffffffffffffffffffffff198116600855167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08280a3005b34610224576020366003190112610224576001600160a01b036109d5610da5565b165f525f602052602060405f2054604051908152f35b346102245760403660031901126102245760043561ffff811690818103610224576024359061ffff82169182810361022457610a25610fa4565b6008549061ffff8260a01c16808611610af4575061ffff8260b01c16808511610ade577f9f5c00d175fcb328d6a07f88f655d29462194433fcc17b06e73880c6119004ec6040878787877fffffffffffffffff00000000ffffffffffffffffffffffffffffffffffffffff75ffff000000000000000000000000000000000000000077ffff000000000000000000000000000000000000000000008a60b01b169360a01b169116171760085582519182526020820152a1005b84631975c8b160e01b5f5260045260245260445ffd5b85631975c8b160e01b5f5260045260245260445ffd5b34610224575f36600319011261022457602060405161ffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b346102245760203660031901126102245761045560043533611207565b34610224575f3660031901126102245760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b34610224575f366003190112610224576020610bb96110eb565b604051908152f35b34610224575f36600319011261022457602060405160128152f35b34610224575f3660031901126102245760206040516103e88152f35b34610224576060366003190112610224576105b2610c14610da5565b610c1c610dbb565b60443591610c2b833383610fcb565b61109a565b34610224575f366003190112610224576020600254604051908152f35b34610224576001600160a01b03610c6336610dd1565b9190610c6d610fa4565b1690811561057d5760207f6a99fe055b37fbb43da2bf48bc37ffb6d8f1fb0cd09c1b41e9ccc5ce70397dba91835f52600a82526105728160405f209060ff801983541691151516179055565b34610224576040366003190112610224576105b2610cd5610da5565b6024359033611220565b34610224575f366003190112610224575f600354610cfc81610e00565b808452906001811690811561067b5750600114610d23576106198361060581850382610eb9565b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b808210610d67575090915081016020016106056105f5565b919260018160209254838588010152019101909291610d4f565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b600435906001600160a01b038216820361022457565b602435906001600160a01b038216820361022457565b6040906003190112610224576004356001600160a01b0381168103610224579060243580151581036102245790565b90600182811c92168015610e2e575b6020831014610e1a57565b634e487b7160e01b5f52602260045260245ffd5b91607f1691610e0f565b5f9291815491610e4783610e00565b8083529260018116908115610e9c5750600114610e6357505050565b5f9081526020812093945091925b838310610e82575060209250010190565b600181602092949394548385870101520191019190610e71565b915050602093945060ff929192191683830152151560051b010190565b90601f8019910116810190811067ffffffffffffffff821117610edb57604052565b634e487b7160e01b5f52604160045260245ffd5b6001600160a01b031680158015610f93575b610f6e57805f52600b60205260ff60405f2054168015610f74575b610f6e575f52600a60205260ff60405f205416610f60576001600160a01b03165f52600a60205260ff60405f205416610f53575f90565b61ffff60085460b01c1690565b5061ffff60085460a01c1690565b50505f90565b506001600160a01b0382165f52600b60205260ff60405f205416610f1c565b506001600160a01b03821615610f01565b6001600160a01b03600854163303610fb857565b63118cdaa760e01b5f523360045260245ffd5b6001600160a01b03909291921691825f52600160205260405f206001600160a01b0382165f5260205260405f2054925f198410611009575b50505050565b828410611076578015611063576001600160a01b03821615611050575f5260016020526001600160a01b0360405f2091165f5260205260405f20910390555f808080611003565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b506001600160a01b038391637dc7a0d960e11b5f521660045260245260445260645ffd5b91906001600160a01b038316156110d8576001600160a01b038116156110c5576110c39261130f565b565b63ec442f0560e01b5f525f60045260245ffd5b634b637e8f60e11b5f525f60045260245ffd5b6001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000163014806111de575b15611146577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a081526111d860c082610eb9565b51902090565b507f0000000000000000000000000000000000000000000000000000000000000000461461111d565b906001600160a01b038216156110d8576110c391611283565b6001600160a01b0316908115611063576001600160a01b03169182156110505760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591835f526001825260405f20855f5282528060405f2055604051908152a3565b9061ffff6112915f84610eef565b1680158015611307575b6112fc578082029082820414821517156112cd576127109004806112e1575b81039081116112cd575f6110c392611521565b634e487b7160e01b5f52601160045260245ffd5b6112f7816001600160a01b036009541685611521565b6112ba565b505f6110c392611521565b50811561129b565b919061ffff61131e8285610eef565b168015801561137e575b611374578083029083820414831517156112cd57612710900480611359575b82039182116112cd576110c392611521565b61136f816001600160a01b036009541686611521565b611347565b506110c392611521565b508215611328565b60ff81146113cc5760ff811690601f82116113bd57604051916113aa604084610eb9565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b506040516113e6816113df816005610e38565b0382610eb9565b90565b60ff811461140d5760ff811690601f82116113bd57604051916113aa604084610eb9565b506040516113e6816113df816006610e38565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084116114a2579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa15611497575f516001600160a01b0381161561148d57905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b600481101561150d57806114bf575050565b600181036114d65763f645eedf60e01b5f5260045ffd5b600281036114f1575063fce698f760e01b5f5260045260245ffd5b6003146114fb5750565b6335e2f38360e21b5f5260045260245ffd5b634e487b7160e01b5f52602160045260245ffd5b6001600160a01b0316908161159d57600254908382018092116112cd576001600160a01b036020917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef936002555b1693846115885780600254036002555b604051908152a3565b845f525f825260405f2081815401905561157f565b815f525f60205260405f20548381106115ef576001600160a01b037fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9285602093865f525f85520360405f205561156f565b91905063391434e360e21b5f5260045260245260445260645ffdddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as `0x${string}`;
