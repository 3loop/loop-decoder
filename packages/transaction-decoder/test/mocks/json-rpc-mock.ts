import { JsonRpcProvider } from 'ethers'
import fs from 'node:fs'
import { RPCProvider, UnknownNetwork } from '@/effect.js'
import { Effect } from 'effect'
import { Block, TransactionReceipt, TransactionResponse } from 'ethers'

interface MockedTransaction {
    transaction: TransactionResponse
    receipt: TransactionReceipt
    trace: any
}

export class MockedProvider extends JsonRpcProvider {
    constructor() {
        super('')
    }

    getTransaction(hash: string) {
        const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
        if (!exists) throw new Error(`Transaction ${hash} not found`)
        const { transaction } = JSON.parse(
            fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
        ) as MockedTransaction
        return Promise.resolve(transaction)
    }

    getTransactionReceipt(hash: string) {
        const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
        if (!exists) throw new Error(`Transaction ${hash} not found`)
        const { receipt } = JSON.parse(
            fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
        ) as MockedTransaction

        return Promise.resolve(receipt)
    }

    send(method: string, params: any[]) {
        if (method === 'trace_transaction') {
            const hash = params[0]
            const exists = fs.existsSync(`./test/mocks/tx/${hash.toLowerCase()}.json`)
            if (!exists) throw new Error(`Transaction ${hash} not found`)
            const { trace } = JSON.parse(
                fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
            ) as MockedTransaction
            return Promise.resolve(trace)
        }
        return Promise.resolve(undefined)
    }

    getBlock(blockNumber: number) {
        return Promise.resolve(JSON.parse(fs.readFileSync(`./test/mocks/tx/${blockNumber}.json`).toString()) as Block)
    }

    // TODO: Add tests to cover proxy contracts
    getStorage(_address: string, _slot: string) {
        return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000')
    }
}

const getProvider = (chainID: number): Effect.Effect<never, UnknownNetwork, JsonRpcProvider> => {
    if (chainID === 5) {
        return Effect.succeed(new MockedProvider())
    }
    return Effect.fail(new UnknownNetwork(chainID))
}

export const MockedRPCProvider = RPCProvider.of({ _tag: 'RPCProvider', getProvider })
