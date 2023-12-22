import { Effect } from 'effect'
import * as Schema from '@effect/schema/Schema'
import { RPCFetchError, RPCProvider } from './provider.js'
import type { TraceLog, TraceLogTree } from './schema/trace.js'
import { EthTrace } from './schema/trace.js'
import { transformTraceTree } from './helpers/trace.js'

export const getTransaction = (hash: string, chainID: number) =>
    Effect.gen(function* (_) {
        const service = yield* _(RPCProvider)
        const { provider } = yield* _(service.getProvider(chainID))
        return yield* _(
            Effect.tryPromise({
                try: () => provider.getTransaction(hash),
                catch: () => new RPCFetchError('Get transaction'),
            }),
        )
    })

export const getTransactionReceipt = (hash: string, chainID: number) =>
    Effect.gen(function* (_) {
        const service = yield* _(RPCProvider)
        const { provider } = yield* _(service.getProvider(chainID))
        return yield* _(
            Effect.tryPromise({
                try: () => provider.getTransactionReceipt(hash),
                catch: () => new RPCFetchError('Get transaction receipt'),
            }),
        )
    })

export const getTrace = (hash: string, chainID: number) =>
    Effect.gen(function* (_) {
        const service = yield* _(RPCProvider)
        const { provider, config } = yield* _(service.getProvider(chainID))
        const traceAPISupport = config?.supportTraceAPI ?? true

        if (traceAPISupport) {
            const trace = yield* _(
                Effect.tryPromise({
                    try: async () => {
                        const trace = await provider.send('trace_transaction', [hash])
                        if (trace == null) return []
                        return trace
                    },
                    catch: () => new RPCFetchError('Get trace'),
                }),
            )

            const effects: Effect.Effect<never, null, TraceLog>[] = trace.map((log: string) => {
                return Schema.parse(EthTrace)(log)
            })

            const results = yield* _(
                Effect.all(effects, {
                    concurrency: 'unbounded',
                }),
            )

            return results
        } else {
            const trace = yield* _(
                Effect.tryPromise({
                    try: async () => {
                        const trace = await provider.send('debug_traceTransaction', [hash, { tracer: 'callTracer' }])
                        if (trace == null) return []
                        return trace
                    },
                    catch: () => new RPCFetchError('Get trace'),
                }),
            )

            const result = trace as TraceLogTree

            const transformedTrace = transformTraceTree(result)

            return transformedTrace
        }
    })

export const getBlockTimestamp = (blockNumber: number, chainID: number) =>
    Effect.gen(function* (_) {
        const service = yield* _(RPCProvider)
        const { provider } = yield* _(service.getProvider(chainID))
        const block = yield* _(
            Effect.tryPromise({
                try: () => provider.getBlock(blockNumber),
                catch: () => new RPCFetchError('Block number'),
            }),
        )

        if (block) {
            return block.timestamp
        }

        return 0
    })
