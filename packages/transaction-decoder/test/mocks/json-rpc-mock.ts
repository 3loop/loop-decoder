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

        if (method === 'eth_getStorageAt') {
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
