import { describe, expect, test } from 'vitest'
import { MockedProvider } from './mocks/json-rpc-mock.js'
import { TransactionDecoder } from '@/vanilla.js'
import fs from 'fs'

describe('Transaction Decoder', () => {
    test('should be able to decode using vanilla API', async () => {
        const decoded = new TransactionDecoder({
            getProvider: (chainID) => {
                if (chainID === 5) return new MockedProvider()
                return undefined
            },
            abiStore: {
                get: async ({ address, signature, event }) => {
                    const addressExists = fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`)

                    if (addressExists) {
                        return fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString()
                    }

                    const sig = signature ?? event
                    if (sig != null) {
                        const signatureExists = fs.existsSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)

                        if (signatureExists) {
                            const signatureAbi = fs
                                .readFileSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)
                                ?.toString()
                            return `[${signatureAbi}]`
                        }
                    }

                    return null
                },
                set: async () => {
                    console.error('Not implemented')
                },
            },
            contractMetaStore: {
                get: async (request) => {
                    if ('0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6' === request.address.toLowerCase()) {
                        return {
                            address: request.address,
                            chainID: request.chainID,
                            contractName: 'Wrapped Ether',
                            contractAddress: request.address,
                            tokenSymbol: 'WETH',
                            decimals: 18,
                            type: 'WETH',
                        }
                    }
                    return {
                        address: request.address,
                        chainID: request.chainID,
                        contractName: 'Mock ERC20 Contract',
                        contractAddress: request.address,
                        tokenSymbol: 'ERC20',
                        decimals: 18,
                        type: 'ERC20',
                    }
                },
                set: async () => {
                    console.error('Not implemented')
                },
            },
        })

        const hash = '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75'

        const result = await decoded.decodeTransaction({
            chainID: 5,
            hash,
        })

        await expect(result).toMatchFileSnapshot(`./snapshots/decoder/${hash}.snapshot`)
    })
})
