import { describe, expect, test } from 'vitest'
import { Effect, Context } from 'effect'
import { ContractLoader, decodeTransactionByHash } from '@/effect.js'
import { RPCProvider } from '../src/provider.js'
import { MockedRPCProvider } from './mocks/json-rpc-mock.js'
import { MockedContractLoader } from './mocks/contract-loader-mock.js'
import { TEST_TRANSACTIONS } from './constants.js'

describe('Transaction Decoder', () => {
    test.each(TEST_TRANSACTIONS)('Resolve and decode transaction', async ({ hash, chainID }) => {
        const program = Effect.gen(function* (_) {
            return yield* _(decodeTransactionByHash(hash, chainID))
        })

        const context = Context.empty().pipe(
            Context.add(RPCProvider, MockedRPCProvider),
            Context.add(ContractLoader, MockedContractLoader),
        )

        const runnable = Effect.provideContext(program, context)

        const result = await Effect.runPromise(runnable)

        await expect(result).toMatchFileSnapshot(`./snapshots/decoder/${hash}.snapshot`)
    })
})
