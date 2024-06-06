import { Abi } from 'viem'

export function messageFromUnknown(cause: unknown, fallback?: string) {
  if (typeof cause === 'string') {
    return cause
  }
  if (cause instanceof Error) {
    return cause.message
  }
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message
  }
  return fallback ?? 'An unknown error occurred'
}

// https://docs.soliditylang.org/en/v0.8.16/control-structures.html#panic-via-assert-and-error-via-require
export const panicReasons = {
  1: 'An `assert` condition failed.',
  17: 'Arithmetic operation resulted in underflow or overflow.',
  18: 'Division or modulo by zero (e.g. `5 / 0` or `23 % 0`).',
  33: 'Attempted to convert to an invalid type.',
  34: 'Attempted to access a storage byte array that is incorrectly encoded.',
  49: 'Performed `.pop()` on an empty array',
  50: 'Array index is out of bounds.',
  65: 'Allocated too much memory or created an array which is too large.',
  81: 'Attempted to call a zero-initialized variable of internal function type.',
} as const

export const solidityError: Abi = [
  {
    name: 'Error',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'message',
        type: 'string',
      },
    ],
    outputs: [],
  },
]

export const solidityPanic: Abi = [
  {
    name: 'Panic',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'reason',
        type: 'uint256',
      },
    ],
    outputs: [],
  },
]

export const errorFunctionSignatures = ['0x4e487b71', '0x08c379a0']
