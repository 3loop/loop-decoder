import { Hex } from 'viem'

// ERC-165: Standard Interface Detection
export const erc165Abi = [
  {
    inputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    constant: true,
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const ERC1155InterfaceId: Hex = '0xd9b67a26'
export const ERC721InterfaceId: Hex = '0x80ac58cd'
