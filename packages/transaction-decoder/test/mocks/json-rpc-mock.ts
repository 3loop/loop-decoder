import fs from 'node:fs'
import { PublicClient, PublicClientObject, UnknownNetwork } from '@/effect.js'
import { Effect } from 'effect'
import { createPublicClient, custom } from 'viem'

interface MockedTransaction {
  transaction: unknown
  receipt: unknown
  trace: any
}

export const mockedTransport = custom({
  request: async ({ method, params }) => {
    if (method === 'eth_getTransactionByHash') {
      const hash = params[0]
      const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
      if (!exists) throw new Error(`Transaction ${hash} not found`)
      const { transaction } = JSON.parse(
        fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
      ) as MockedTransaction
      return Promise.resolve(transaction)
    }
    if (method === 'eth_getTransactionReceipt') {
      const hash = params[0]
      const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
      if (!exists) throw new Error(`Transaction ${hash} not found`)
      const { receipt } = JSON.parse(
        fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
      ) as MockedTransaction
      return Promise.resolve(receipt)
    }

    if (method === 'trace_transaction') {
      const hash = params[0]
      const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
      if (!exists) throw new Error(`Transaction ${hash} not found`)
      const { trace } = JSON.parse(
        fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
      ) as MockedTransaction
      return Promise.resolve(trace)
    }

    if (method === 'eth_getBlockByNumber') {
      // TODO: store block as hex?
      const blockNumber = Number(params[0])
      return Promise.resolve(JSON.parse(fs.readFileSync(`./test/mocks/tx/${blockNumber}.json`).toString()))
    }

    // TODO: add mocks for storage slots
    if (method === 'eth_getStorageAt') {
      // NOTE: mock for BLUR
      if (params[0] === '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5') {
        return Promise.resolve('0x0000000000000000000000005fa60726E62c50Af45Ff2F6280C468DA438A7837')
      }
      if (params[0] === '0x0000000000a39bb272e79075ade125fd351887ac') {
        return Promise.resolve('0x00000000000000000000000001a656024de4B89e2D0198BF4D468E8fd2358b17')
      }

      if (params[0] === '0x2e175f748976cd5cdb98f12d1abc5d137d6c9379') {
        return Promise.resolve('0x00000000000000000000000001a656024de4B89e2D0198BF4D468E8fd2358b17')
      }
      return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000')
    }

    throw new Error(`Method ${method} not implemented`)
  },
})

const getPublicClient = (): Effect.Effect<PublicClientObject, UnknownNetwork> => {
  return Effect.succeed({
    client: createPublicClient({
      transport: mockedTransport,
    }),
  })
}

export const MockedRPCProvider = PublicClient.of({ _tag: 'PublicClient', getPublicClient })
