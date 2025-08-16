import { describe, expect, test } from 'vitest'
import { MockedTransaction, mockedTransport } from './mocks/json-rpc-mock.js'
import { TransactionDecoder } from '../src/vanilla.js'
import * as fs from 'fs'
import { createPublicClient } from 'viem'
import { goerli } from 'viem/chains'
import { ERC20RPCStrategyResolver } from '../src/index.js'
import { TEST_TRANSACTIONS } from './constants.js'

describe('Transaction Decoder', () => {
  describe('should be able to decode using vanilla API', async () => {
    const decoded = new TransactionDecoder({
      getPublicClient: (chainID) => {
        if (chainID === 5) {
          return {
            client: createPublicClient({
              chain: goerli,
              transport: mockedTransport,
            }),
          }
        }
        return undefined
      },
      abiStore: {
        get: async ({ address, signature, event }) => {
          const addressExists = fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`)

          if (addressExists) {
            return [
              {
                type: 'address',
                abi: fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString(),
                address,
                chainID: 5,
                status: 'success',
              },
            ]
          }

          const sig = signature ?? event
          if (sig != null) {
            const signatureAbi = fs.readFileSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)?.toString()

            if (signature) {
              return [
                {
                  type: 'func',
                  abi: signatureAbi,
                  address,
                  chainID: 1,
                  signature,
                  status: 'success',
                },
              ]
            } else if (event) {
              return [
                {
                  type: 'event',
                  abi: signatureAbi,
                  address,
                  chainID: 1,
                  event,
                  status: 'success',
                },
              ]
            }
          }

          return []
        },
        set: async () => {
          console.debug('Not implemented')
        },
      },
      contractMetaStore: {
        strategies: [ERC20RPCStrategyResolver],
        get: async (request) => {
          if ('0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6' === request.address.toLowerCase()) {
            return {
              status: 'success',
              result: {
                address: request.address,
                chainID: request.chainID,
                contractName: 'Wrapped Ether',
                contractAddress: request.address,
                tokenSymbol: 'WETH',
                decimals: 18,
                type: 'WETH',
              },
            }
          }
          return {
            status: 'success',
            result: {
              address: request.address,
              chainID: request.chainID,
              contractName: 'Mock ERC20 Contract',
              contractAddress: request.address,
              tokenSymbol: 'ERC20',
              decimals: 18,
              type: 'ERC20',
            },
          }
        },
        set: async () => {
          console.debug('Not implemented')
        },
      },
    })

    test('should be able to decode transaction by hash', async () => {
      const hash = '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75'

      const result = await decoded.decodeTransaction({
        chainID: 5,
        hash,
      })

      await expect(result).toMatchFileSnapshot(`./snapshots/decoder/${hash}.snapshot`)
    })

    test('should be able to decode calldata', async () => {
      const tx = TEST_TRANSACTIONS.find((tx) => tx.chainID === 5)
      if (tx == null) {
        throw new Error('Transaction not found')
      }

      const { hash, chainID } = tx
      const { transaction } = JSON.parse(
        fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
      ) as MockedTransaction

      const contractAddress = transaction?.to

      const result = await decoded.decodeCalldata({
        data: transaction?.input,
        chainID,
        contractAddress,
      })

      await expect(result).toMatchFileSnapshot(`./snapshots/calldata/${hash}.snapshot`)
    })
  })
})
