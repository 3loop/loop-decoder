import { Effect } from 'effect'
import * as Schema from '@effect/schema/Schema'
import { RPCFetchError, PublicClient } from './public-client.js'
import type { TraceLog, TraceLogTree } from './schema/trace.js'
import { EthTrace } from './schema/trace.js'
import { transformTraceTree } from './helpers/trace.js'
import { type Hash } from 'viem'
import { ParseError } from '@effect/schema/ParseResult'

export const getTransaction = (hash: Hash, chainID: number) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client } = yield* service.getPublicClient(chainID)
    return yield* Effect.withSpan(
      Effect.tryPromise({
        try: () => client.getTransaction({ hash }),
        catch: () => new RPCFetchError('Get transaction'),
      }),
      'TransactionLoader.Transaction',
      { attributes: { hash, chainID } },
    )
  })

export const getTransactionReceipt = (hash: Hash, chainID: number) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client } = yield* service.getPublicClient(chainID)
    return yield* Effect.withSpan(
      Effect.tryPromise({
        try: () => client.getTransactionReceipt({ hash }),
        catch: () => new RPCFetchError('Get transaction receipt'),
      }),
      'TransactionLoader.Receipt',
      { attributes: { hash, chainID } },
    )
  })

export const getTrace = (hash: Hash, chainID: number) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client, config } = yield* service.getPublicClient(chainID)
    const traceAPISupport = config?.supportTraceAPI ?? true

    if (traceAPISupport) {
      const trace = yield* Effect.withSpan(
        Effect.tryPromise({
          try: async () => {
            const trace = await (client.request({
              method: 'trace_transaction' as any,
              params: [hash],
            }) as Promise<string[]>)
            if (trace == null) return []
            return trace
          },
          catch: () => new RPCFetchError('Get trace'),
        }),
        'TransactionLoader.Trace',
        { attributes: { hash, chainID, traceAPISupport } },
      )

      const effects: Effect.Effect<TraceLog, ParseError>[] = trace.map((log: string) => {
        return Schema.decodeUnknown(EthTrace)(log)
      })

      const results = yield* Effect.all(effects, {
        concurrency: 'inherit',
        batching: 'inherit',
      })

      return results
    } else {
      const trace = yield* Effect.withSpan(
        Effect.tryPromise({
          try: async () => {
            const trace = await client.request({
              method: 'debug_traceTransaction',
              params: [hash, { tracer: 'callTracer' }],
            } as any)
            if (trace == null) return []
            return trace
          },
          catch: (e) => new RPCFetchError(e),
        }),
        'TransactionLoader.Trace',
        { attributes: { hash, chainID, traceAPISupport } },
      )

      const transformedTrace = transformTraceTree(trace as unknown as TraceLogTree)

      return transformedTrace
    }
  })

export const getBlockTimestamp = (blockNumber: bigint, chainID: number) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client } = yield* service.getPublicClient(chainID)
    const block = yield* Effect.withSpan(
      Effect.tryPromise({
        try: () => client.getBlock({ blockNumber }),
        catch: () => new RPCFetchError('Block number'),
      }),
      'TransactionLoader.Block',
      { attributes: { blockNumber, chainID } },
    )

    if (block) {
      return block.timestamp
    }

    return 0
  })
