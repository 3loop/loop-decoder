import { describe, expect, test } from 'vitest'
import { Effect, Layer, pipe } from 'effect'
import { decodeTransactionByHash, decodeCalldata } from '@/effect.js'
import { PublicClient } from '../src/public-client.js'
import { MockedRPCProvider, MockedTransaction } from './mocks/json-rpc-mock.js'
import { TEST_TRANSACTIONS } from './constants.js'
import { MockedAbiStoreLive } from './mocks/abi-loader-mock.js'
import { MockedMetaStoreLive } from './mocks/meta-loader-mock.js'
import fs from 'fs'

describe('Transaction Decoder', () => {
  test.each(TEST_TRANSACTIONS)('Resolve and decode transaction', async ({ hash, chainID }) => {
    const program = Effect.gen(function* () {
      return yield* decodeTransactionByHash(hash, chainID)
    })

    const LoadersLayer = Layer.provideMerge(MockedAbiStoreLive, MockedMetaStoreLive)
    const RPCProviderLive = Layer.succeed(PublicClient, MockedRPCProvider)

    const MainLayer = Layer.provideMerge(RPCProviderLive, LoadersLayer)

    const customRuntime = pipe(Layer.toRuntime(MainLayer), Effect.scoped, Effect.runSync)

    const result = await program.pipe(Effect.provide(customRuntime), Effect.runPromise)

    await expect(result).toMatchFileSnapshot(`./snapshots/decoder/${hash}.snapshot`)
  })
})

describe('Calldata Decoder', () => {
  test.each(TEST_TRANSACTIONS)('Resolve and decode transaction', async ({ hash, chainID }) => {
    const program = Effect.gen(function* () {
      const { transaction } = JSON.parse(
        fs.readFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`).toString(),
      ) as MockedTransaction

      const data = transaction?.input
      return yield* decodeCalldata({ data, chainID, contractAddress: transaction?.to })
    })

    const RPCProviderLive = Layer.succeed(PublicClient, MockedRPCProvider)
    const MainLayer = Layer.provideMerge(RPCProviderLive, MockedAbiStoreLive)
    const customRuntime = pipe(Layer.toRuntime(MainLayer), Effect.scoped, Effect.runSync)
    const result = await program.pipe(Effect.provide(customRuntime), Effect.runPromise)

    await expect(result).toMatchFileSnapshot(`./snapshots/calldata/${hash}.snapshot`)
  })
})
