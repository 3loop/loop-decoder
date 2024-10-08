import fs from 'node:fs'
import { PublicClient, PublicClientObject, UnknownNetwork } from '@/effect.js'
import { Effect } from 'effect'
import { createPublicClient, custom } from 'viem'

export interface MockedTransaction {
  transaction: any
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
      if (params[0].toLowerCase() === '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5') {
        return Promise.resolve('0x0000000000000000000000005fa60726E62c50Af45Ff2F6280C468DA438A7837')
      }
      if (params[0].toLowerCase() === '0x0000000000a39bb272e79075ade125fd351887ac') {
        return Promise.resolve('0x00000000000000000000000001a656024de4B89e2D0198BF4D468E8fd2358b17')
      }

      if (params[0].toLowerCase() === '0x2e175f748976cd5cdb98f12d1abc5d137d6c9379') {
        return Promise.resolve('0x00000000000000000000000001a656024de4B89e2D0198BF4D468E8fd2358b17')
      }

      // AAVE
      if (params[0].toLowerCase() === '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2') {
        return Promise.resolve('0x00000000000000000000000005FAab9E1adbddaD0a08734BE8a52185Fd6558E14')
      }
      return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000')
    }

    if (method === 'eth_call') {
      // NOTE: mock for Gnosis Safe

      if (params[0].to.toLowerCase() === '0x78c38d0e31592822135c83873e68c7ee4df82586') {
        return Promise.resolve('0x000000000000000000000000fb1bffc9d739b8d520daf37df666da4c687191ea')
      }

      if (params[0].to.toLowerCase() === '0xbd4b515ed602792497364de7c306659297378fae') {
        return Promise.resolve('0x0000000000000000000000003e5c63644e683549055b9be8653de26e0b4cd36e')
      }

      if (params[0].to.toLowerCase() === '0x2d8880bcc0618dbcc5d516640015a69e28fdc406') {
        return Promise.resolve('0x000000000000000000000000d9db270c1b5e3bd161e8c8503c55ceabee709552')
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
