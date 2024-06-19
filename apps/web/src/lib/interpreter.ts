import type { DecodedTx } from '@3loop/transaction-decoder'
import {
  Interpreter,
  QuickjsInterpreterLive,
  QuickjsConfig,
  TransactionInterpreter,
} from '@3loop/transaction-interpreter'
import { Effect, Layer } from 'effect'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'

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

export const emptyInterpreter: Interpreter = {
  schema: `function transformEvent(event){
    return event;
};
`,
  id: 'empty',
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

export function findInterpreter({
  decodedTx,
  interpreters,
}: {
  decodedTx: DecodedTx
  interpreters: Interpreter[]
}): Interpreter | undefined {
  try {
    const { toAddress: contractAddress, chainID } = decodedTx

    if (!contractAddress) {
      return undefined
    }

    const id = `contract:${contractAddress.toLowerCase()},chain:${chainID}`

    const contractTransformation = interpreters.find((interpreter) => interpreter.id.toLowerCase() === id)

    return contractTransformation
  } catch (e) {
    throw new Error(`Failed to find tx interpreter: ${e}`)
  }
}

export async function findAndRunInterpreter(
  decodedTx: DecodedTx,
  interpreters: Interpreter[],
): Promise<Interpretation> {
  const interpreter = findInterpreter({ decodedTx, interpreters })

  if (!interpreter) {
    return {
      tx: decodedTx,
      interpretation: null,
    }
  }

  const res = await applyInterpreter(decodedTx, interpreter)

  return res
}
