import { Abi } from 'viem'

// Same address on all supported chains https://www.multicall3.com/deployments
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'
export const SAFE_MULTISEND_SIGNATURE = 'multiSend(bytes)'
export const SAFE_MULTISEND_ABI: Abi = [
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
