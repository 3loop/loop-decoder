import fs from 'node:fs'
import { PublicClient, PublicClientObject, UnknownNetwork } from '../../src/index.js'
import { Effect } from 'effect'
import { createPublicClient, custom } from 'viem'
import { PROXY_SLOTS, RPC, ZERO_SLOT } from '../constants.js'

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

    if (method === 'eth_getStorageAt') {
      const [address, slot] = params

      if (!PROXY_SLOTS.includes(slot)) {
        return Promise.resolve(ZERO_SLOT)
      }

      const exists = fs.existsSync(`./test/mocks/address/${address.toLowerCase()}.json`)
      const cachedData = JSON.parse(
        fs.readFileSync(`./test/mocks/address/${address.toLowerCase()}.json`).toString(),
      ) as {
        slots?: Record<string, string>
      }

      const { slots } = cachedData
      let slotValue: string | undefined = slots?.[slot]

      if (!exists || !slotValue) {
        console.log('Making eth_getStorageAt request for', params)

        const resp = await fetch(RPC, {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getStorageAt',
            params,
            id: 1,
          }),
        })

        const data = (await resp.json()) as { result?: string }

        slotValue = data.result || ZERO_SLOT
        fs.writeFileSync(
          `./test/mocks/address/${address.toLowerCase()}.json`,
          JSON.stringify({ ...cachedData, slots: { ...slots, [slot]: slotValue } }, null, 2),
        )
      }

      return Promise.resolve(slotValue)
    }

    if (method === 'eth_call') {
      // NOTE: mock for Gnosis Safe
      const { to, data } = params[0]
      const exists = fs.existsSync(`./test/mocks/address/${to.toLowerCase()}.json`)
      const cachedData = JSON.parse(fs.readFileSync(`./test/mocks/address/${to.toLowerCase()}.json`).toString()) as {
        slots?: Record<string, string>
      }

      const { slots } = cachedData
      let slotValue: string | undefined = slots?.[data]

      if (!exists || !slotValue) {
        console.log('Making eth_call request for', params)
        const resp = await fetch(RPC, {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params,
            id: 1,
          }),
        })

        const dataResponse = (await resp.json()) as { result?: string }

        slotValue = dataResponse.result || ZERO_SLOT
        fs.writeFileSync(
          `./test/mocks/address/${to.toLowerCase()}.json`,
          JSON.stringify({ ...cachedData, slots: { ...slots, [data]: slotValue } }, null, 2),
        )
      }

      return Promise.resolve(slotValue)
    }

    if (method === 'eth_getCode') {
      const address = params[0]
      const exists = fs.existsSync(`./test/mocks/address/${address.toLowerCase()}.json`)

      const cachedData = JSON.parse(
        fs.readFileSync(`./test/mocks/address/${address.toLowerCase()}.json`).toString(),
      ) as {
        code: string
      }

      let code = cachedData.code

      if (!exists || !code) {
        console.log('Making eth_getCode request for', params)
        const resp = await fetch(RPC, {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getCode',
            params,
            id: 1,
          }),
        })
        const data = (await resp.json()) as { result?: string }
        code = data.result || '0x'
        fs.writeFileSync(
          `./test/mocks/address/${address.toLowerCase()}.json`,
          JSON.stringify({ ...cachedData, code }, null, 2),
        )
      }
      return Promise.resolve(code)
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
