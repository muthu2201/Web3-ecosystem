/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/export-abis.mjs from the Foundry build output. Edit the Solidity source
 * and re-run `pnpm contracts:abi` instead; a hand-edit here would make the SDK describe a
 * contract that does not exist on chain.
 */

export const StandardTokenAbi = [
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
        "name": "deployer_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
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
    "name": "riskFlags",
    "inputs": [],
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

export const StandardTokenBytecode = "0x6101a080604052346105125761163b803803809161001d8285610516565b8339810160a0828203126105125781516001600160401b0381116105125781610047918401610539565b602083015190916001600160401b03821161051257610067918401610539565b91604081015190610086608061007f6060840161058e565b920161058e565b926040948551916100978784610516565b60018352603160f81b6020840190815281519092906001600160401b03811161042257600354600181811c91168015610508575b602082101461040457601f81116104a5575b50806020601f8211600114610441575f91610436575b508160011b915f199060031b1c1916176003555b8051906001600160401b0382116104225760045490600182811c92168015610418575b60208310146104045781601f849311610396575b50602090601f8311600114610330575f92610325575b50508160011b915f199060031b1c1916176004555b610172816105a2565b6101205261017f83610729565b6101405260208151910120918260e05251902080610100524660a05285519060208201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f84528783015260608201524660808201523060a082015260a081526101ea60c082610516565b5190206080523060c0526001600160a01b031691821590818015610314575b6103055782156102f6576101605281610180526102e357600254908082018092116102cf5760207fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef915f936002558484528382528584208181540190558551908152a351610dd99081610862823960805181610a74015260a05181610b31015260c05181610a45015260e05181610ac301526101005181610ae9015261012051816104060152610140518161042f0152610160518161017e015261018051816105f30152f35b634e487b7160e01b5f52601160045260245ffd5b63ec442f0560e01b5f525f60045260245ffd5b63c16f3a9360e01b5f5260045ffd5b63d92e233d60e01b5f5260045ffd5b506001600160a01b03811615610209565b015190505f80610154565b60045f9081528281209350601f198516905b81811061037e5750908460019594939210610366575b505050811b01600455610169565b01515f1960f88460031b161c191690555f8080610358565b92936020600181928786015181550195019301610342565b60045f529091507f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b601f840160051c810191602085106103fa575b90601f859493920160051c01905b8181106103ec575061013e565b5f81558493506001016103df565b90915081906103d1565b634e487b7160e01b5f52602260045260245ffd5b91607f169161012a565b634e487b7160e01b5f52604160045260245ffd5b90508301515f6100f3565b60035f9081528181209250601f198416905b81811061048d57509083600194939210610475575b5050811b01600355610107565b8501515f1960f88460031b161c191690555f80610468565b9192602060018192868a015181550194019201610453565b60035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b601f830160051c810191602084106104fe575b601f0160051c01905b8181106104f357506100dd565b5f81556001016104e6565b90915081906104dd565b90607f16906100cb565b5f80fd5b601f909101601f19168101906001600160401b0382119082101761042257604052565b81601f82011215610512578051906001600160401b038211610422576040519261056d601f8401601f191660200185610516565b8284526020838301011161051257815f9260208093018386015e8301015290565b51906001600160a01b038216820361051257565b908151602081105f1461061c575090601f8151116105dc5760208151910151602082106105cd571790565b5f198260200360031b1b161790565b604460209160405192839163305a27a960e01b83528160048401528051918291826024860152018484015e5f828201840152601f01601f19168101030190fd5b6001600160401b03811161042257600554600181811c9116801561071f575b602082101461040457601f81116106ec575b50602092601f821160011461068b57928192935f92610680575b50508160011b915f199060031b1c19161760055560ff90565b015190505f80610667565b601f1982169360055f52805f20915f5b8681106106d457508360019596106106bc575b505050811b0160055560ff90565b01515f1960f88460031b161c191690555f80806106ae565b9192602060018192868501518155019401920161069b565b60055f52601f60205f20910160051c810190601f830160051c015b818110610714575061064d565b5f8155600101610707565b90607f169061063b565b908151602081105f14610754575090601f8151116105dc5760208151910151602082106105cd571790565b6001600160401b03811161042257600654600181811c91168015610857575b602082101461040457601f8111610824575b50602092601f82116001146107c357928192935f926107b8575b50508160011b915f199060031b1c19161760065560ff90565b015190505f8061079f565b601f1982169360065f52805f20915f5b86811061080c57508360019596106107f4575b505050811b0160065560ff90565b01515f1960f88460031b161c191690555f80806107e6565b919260206001819286850151815501940192016107d3565b60065f52601f60205f20910160051c810190601f830160051c015b81811061084c5750610785565b5f815560010161083f565b90607f169061077356fe6080806040526004361015610012575f80fd5b5f3560e01c90816306fdde03146106ce57508063095ea7b3146106a857806318160ddd1461068b57806323b872dd14610653578063313ce567146106385780633644e51514610616578063378dc3dc146105dc57806342966c68146105bf57806370a082311461058857806379cc6790146105585780637aa77f291461051e5780637ecebe00146104e657806384b0196e146103ee57806395d89b411461030c578063a9059cbb146102db578063d505accf146101a2578063d5f394881461015f578063dd62ed3e1461010b5763ef7773b0146100ed575f80fd5b34610107575f3660031901126101075760206040515f8152f35b5f80fd5b3461010757604036600319011261010757610124610794565b6001600160a01b036101346107aa565b91165f5260016020526001600160a01b0360405f2091165f52602052602060405f2054604051908152f35b34610107575f3660031901126101075760206040516001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000168152f35b346101075760e0366003190112610107576101bb610794565b6101c36107aa565b604435906064359260843560ff81168103610107578442116102c85761029c6102936001600160a01b039283851697885f52600760205260405f20908154916001830190556040519060208201927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c984528b6040840152878a1660608401528a608084015260a083015260c082015260c0815261026160e082610879565b51902061026c610a3b565b906040519161190160f01b83526002830152602282015260c43591604260a4359220610cd8565b90929192610d65565b168481036102b157506102af9350610bdb565b005b84906325c0072360e11b5f5260045260245260445ffd5b8463313c898160e11b5f5260045260245ffd5b34610107576040366003190112610107576103016102f7610794565b602435903361097e565b602060405160018152f35b34610107575f366003190112610107576040515f60045461032c816107c0565b80845290600181169081156103ca575060011461036c575b6103688361035481850382610879565b604051918291602083526020830190610770565b0390f35b60045f9081527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b939250905b8082106103b057509091508101602001610354610344565b919260018160209254838588010152019101909291610398565b60ff191660208086019190915291151560051b840190910191506103549050610344565b34610107575f3660031901126101075761048a61042a7f0000000000000000000000000000000000000000000000000000000000000000610c3e565b6104537f0000000000000000000000000000000000000000000000000000000000000000610ca1565b6020610498604051926104668385610879565b5f84525f368137604051958695600f60f81b875260e08588015260e0870190610770565b908582036040870152610770565b4660608501523060808501525f60a085015283810360c08501528180845192838152019301915f5b8281106104cf57505050500390f35b8351855286955093810193928101926001016104c0565b34610107576020366003190112610107576001600160a01b03610507610794565b165f526007602052602060405f2054604051908152f35b34610107575f3660031901126101075760206040517fe102a5e03e0d3ca217d09bc1c971273f18e8cffed2bf1e8fe7b8f932b501c68e8152f35b34610107576040366003190112610107576102af610574610794565b602435906105838233836108af565b610b57565b34610107576020366003190112610107576001600160a01b036105a9610794565b165f525f602052602060405f2054604051908152f35b34610107576020366003190112610107576102af60043533610b57565b34610107575f3660031901126101075760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b34610107575f366003190112610107576020610630610a3b565b604051908152f35b34610107575f36600319011261010757602060405160128152f35b346101075760603660031901126101075761030161066f610794565b6106776107aa565b604435916106868333836108af565b61097e565b34610107575f366003190112610107576020600254604051908152f35b34610107576040366003190112610107576103016106c4610794565b6024359033610bdb565b34610107575f366003190112610107575f6003546106eb816107c0565b80845290600181169081156103ca5750600114610712576103688361035481850382610879565b60035f9081527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b939250905b80821061075657509091508101602001610354610344565b91926001816020925483858801015201910190929161073e565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b600435906001600160a01b038216820361010757565b602435906001600160a01b038216820361010757565b90600182811c921680156107ee575b60208310146107da57565b634e487b7160e01b5f52602260045260245ffd5b91607f16916107cf565b5f9291815491610807836107c0565b808352926001811690811561085c575060011461082357505050565b5f9081526020812093945091925b838310610842575060209250010190565b600181602092949394548385870101520191019190610831565b915050602093945060ff929192191683830152151560051b010190565b90601f8019910116810190811067ffffffffffffffff82111761089b57604052565b634e487b7160e01b5f52604160045260245ffd5b6001600160a01b03909291921691825f52600160205260405f206001600160a01b0382165f5260205260405f2054925f1984106108ed575b50505050565b82841061095a578015610947576001600160a01b03821615610934575f5260016020526001600160a01b0360405f2091165f5260205260405f20910390555f8080806108e7565b634a1406b160e11b5f525f60045260245ffd5b63e602df0560e01b5f525f60045260245ffd5b506001600160a01b038391637dc7a0d960e11b5f521660045260245260445260645ffd5b6001600160a01b0316908115610a28576001600160a01b0316918215610a1557815f525f60205260405f20548181106109fc57817fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92602092855f525f84520360405f2055845f525f825260405f20818154019055604051908152a3565b8263391434e360e21b5f5260045260245260445260645ffd5b63ec442f0560e01b5f525f60045260245ffd5b634b637e8f60e11b5f525f60045260245ffd5b6001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016301480610b2e575b15610a96577f000000000000000000000000000000000000000000000000000000000000000090565b60405160208101907f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f82527f000000000000000000000000000000000000000000000000000000000000000060408201527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260a08152610b2860c082610879565b51902090565b507f00000000000000000000000000000000000000000000000000000000000000004614610a6d565b9091906001600160a01b03168015610a2857805f525f60205260405f2054838110610bc1576020845f94957fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef938587528684520360408620558060025403600255604051908152a3565b915063391434e360e21b5f5260045260245260445260645ffd5b6001600160a01b0316908115610947576001600160a01b03169182156109345760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591835f526001825260405f20855f5282528060405f2055604051908152a3565b60ff8114610c845760ff811690601f8211610c755760405191610c62604084610879565b6020808452838101919036833783525290565b632cd44ac360e21b5f5260045ffd5b50604051610c9e81610c978160056107f8565b0382610879565b90565b60ff8114610cc55760ff811690601f8211610c755760405191610c62604084610879565b50604051610c9e81610c978160066107f8565b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411610d5a579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa15610d4f575f516001600160a01b03811615610d4557905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f9160039190565b6004811015610dc55780610d77575050565b60018103610d8e5763f645eedf60e01b5f5260045ffd5b60028103610da9575063fce698f760e01b5f5260045260245ffd5b600314610db35750565b6335e2f38360e21b5f5260045260245ffd5b634e487b7160e01b5f52602160045260245ffd" as `0x${string}`;
