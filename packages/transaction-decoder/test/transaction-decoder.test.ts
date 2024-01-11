import { describe, expect, test } from 'vitest'
import { Effect, Layer, pipe } from 'effect'
import { decodeTransactionByHash } from '@/effect.js'
import { RPCProvider } from '../src/provider.js'
import { MockedRPCProvider } from './mocks/json-rpc-mock.js'
import { TEST_TRANSACTIONS } from './constants.js'
import { MockedAbiStoreLive } from './mocks/abi-loader-mock.js'
import { MockedMetaStoreLive } from './mocks/meta-loader-mock.js'

describe('Transaction Decoder', () => {
    test.each(TEST_TRANSACTIONS)('Resolve and decode transaction', async ({ hash, chainID }) => {
        const program = Effect.gen(function* (_) {
            return yield* _(decodeTransactionByHash(hash, chainID))
        })

        const LoadersLayer = Layer.provideMerge(MockedAbiStoreLive, MockedMetaStoreLive)
        const RPCProviderLive = Layer.succeed(RPCProvider, MockedRPCProvider)

        const MainLayer = Layer.provideMerge(RPCProviderLive, LoadersLayer)

        const customRuntime = pipe(Layer.toRuntime(MainLayer), Effect.scoped, Effect.runSync)

        const result = await program.pipe(Effect.provide(customRuntime), Effect.runPromise)

        await expect(result).toMatchFileSnapshot(`./snapshots/decoder/${hash}.snapshot`)
    })
})
