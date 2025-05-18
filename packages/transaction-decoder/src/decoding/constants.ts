import { Abi } from 'viem'

// Same address on all supported chains https://www.multicall3.com/deployments
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'
export const SAFE_MULTISEND_SIGNATURE = '0x8d80ff0a'

export const SAFE_MULTISEND_ABI: Abi = [
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'transactions',
        type: 'bytes',
      },
    ],
    name: 'multiSend',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
]

export const SAFE_MULTISEND_NESTED_ABI: Abi = [
  {
    name: 'transactions',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        type: 'tuple[]',
        components: [
          {
            name: 'operation',
            type: 'uint256',
          },
          {
            name: 'to',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'dataLength',
            type: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
  },
]
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const AA_ABIS: Record<string, Abi> = {
  '0xabc5345e': [
    {
      name: 'executeBySender',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        {
          name: 'calls',
          type: 'tuple[]',
          components: [
            { name: 'target', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
          ],
        },
      ],
      outputs: [],
    },
  ],
  '0x34fcd5be': [
    {
      inputs: [
        {
          components: [
            { name: 'target', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
          ],
          name: 'calls',
          type: 'tuple[]',
        },
      ],
      name: 'executeBatch',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
  ],
  '0x9e5d4c49': [
    {
      type: 'function',
      inputs: [
        { name: 'to', internalType: 'address', type: 'address' },
        { name: 'value', internalType: 'uint256', type: 'uint256' },
        { name: 'data', internalType: 'bytes', type: 'bytes' },
      ],
      name: 'executeCall',
      outputs: [
        { name: 'success', internalType: 'bool', type: 'bool' },
        { name: 'returnData', internalType: 'bytes', type: 'bytes' },
      ],
      stateMutability: 'nonpayable',
    },
  ],
  '0x912ccaa3': [
    {
      inputs: [
        {
          name: 'target',
          type: 'address[]',
        },
        {
          name: 'value',
          type: 'uint256[]',
        },
        {
          name: 'targetCallData',
          type: 'bytes[]',
        },
      ],
      name: 'executeBatchCall',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  '0x18dfb3c7': [
    {
      name: 'execute',
      type: 'function',
      inputs: [
        {
          name: 'target',
          type: 'address[]',
        },
        {
          name: 'callData',
          type: 'bytes[]',
        },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],
  '0xb61d27f6': [
    {
      name: 'execute',
      type: 'function',
      inputs: [
        {
          name: 'target',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'data',
          type: 'bytes',
        },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],
  '0x51945447': [
    {
      type: 'function',
      inputs: [
        { name: 'to', internalType: 'address', type: 'address' },
        { name: 'value', internalType: 'uint256', type: 'uint256' },
        { name: 'data', internalType: 'bytes', type: 'bytes' },
        { name: 'operation', internalType: 'enum Operation', type: 'uint8' },
      ],
      name: 'execute',
      outputs: [],
      stateMutability: 'payable',
    },
  ],
  '0xf34308ef': [
    {
      name: 'execTransactionFromEntrypoint',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ],
      outputs: [],
    },
  ],
  '0x541d63c8': [
    {
      name: 'executeUserOpWithErrorString',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint8' },
      ],
      outputs: [],
    },
  ],
}
