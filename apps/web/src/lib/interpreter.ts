import { Interpreter, interpretTx, DecodedTx, initQuickJSVM, QuickJSVM } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'

const layer = Layer.effect(
  QuickJSVM,
  Effect.tryPromise(async () => ({
    _tag: 'QuickJSVM' as const,
    runtime: await initQuickJSVM({
      variant: variant,
      runtimeConfig: { timeout: 1000 },
    }),
  })),
)

export interface Interpretation {
  tx: DecodedTx
  interpretation: any
  error?: string
}

export const emptyInterpreter: Interpreter = {
  id: 'default',
  schema: `function transformEvent(event){
    return event;
};
`,
}

export async function applyInterpreter(decodedTx: DecodedTx, interpreter: Interpreter): Promise<Interpretation> {
  const runnable = Effect.provide(interpretTx({ decodedTx, interpreter }), layer)

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
