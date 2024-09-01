import type { DecodedTx } from '@3loop/transaction-decoder'
import {
  Interpreter,
  QuickjsInterpreterLive,
  QuickjsConfig,
  TransactionInterpreter,
  fallbackInterpreter,
} from '@3loop/transaction-interpreter'
import { Effect, Layer } from 'effect'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import { getInterpreter } from '@3loop/transaction-interpreter'

const config = Layer.succeed(QuickjsConfig, {
  variant: variant,
  runtimeConfig: { timeout: 1000 },
})

const layer = Layer.provide(QuickjsInterpreterLive, config)

export interface Interpretation {
  tx: DecodedTx
  interpretation: any
  error?: string
}

export async function applyInterpreter(decodedTx: DecodedTx, interpreter: Interpreter): Promise<Interpretation> {
  const runnable = Effect.gen(function* () {
    const interpreterService = yield* TransactionInterpreter
    const interpretation = yield* interpreterService.interpretTx(decodedTx, interpreter)
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

export async function findAndRunInterpreter(decodedTx: DecodedTx): Promise<Interpretation> {
  let interpreter = getInterpreter(decodedTx)

  if (!interpreter) {
    interpreter = fallbackInterpreter
  }

  const res = await applyInterpreter(decodedTx, {
    id: 'default',
    schema: interpreter,
  })

  return res
}
