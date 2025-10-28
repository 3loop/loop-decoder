import type { DecodedTransaction } from '@3loop/transaction-decoder'
import {
  Interpreter,
  QuickjsInterpreterLive,
  QuickjsConfig,
  TransactionInterpreter,
} from '@3loop/transaction-interpreter'
import { Effect, Layer } from 'effect'
import variant from '@jitl/quickjs-singlefile-cjs-release-sync'

// Server-side interpreter configuration using Node.js QuickJS variant
// This runs in Node.js context where CORS restrictions don't apply
const config = Layer.succeed(QuickjsConfig, {
  variant: variant,
  runtimeConfig: {
    timeout: 5000,
    useFetch: true,
  },
})

const layer = Layer.provide(QuickjsInterpreterLive, config)

export interface Interpretation {
  tx: DecodedTransaction
  interpretation: any
  error?: string
}

export const applyInterpreterServer = async (
  decodedTx: DecodedTransaction,
  interpreter: Interpreter,
  interpretAsUserAddress?: string,
): Promise<Interpretation> => {
  const runnable = Effect.gen(function* () {
    const interpreterService = yield* TransactionInterpreter
    const interpretation = yield* interpreterService.interpretTransaction(decodedTx, interpreter, {
      interpretAsUserAddress,
    })
    return interpretation
  }).pipe(Effect.provide(layer))

  return Effect.runPromise(runnable)
    .then((interpretation) => {
      return {
        tx: decodedTx,
        interpretation,
      }
    })
    .catch((e) => {
      return {
        tx: decodedTx,
        interpretation: null,
        error: (e as Error).message,
      }
    })
}
