import { Interpreter, applyInterpreterInVM, DecodedTx, initQuickJSVM, QuickJSVM } from '@3loop/transaction-decoder'
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

export const defaultInterpreters: Interpreter[] = [
  {
    id: 'contract:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9,chain:1',
    schema: `
function transformEvent(event) {
    const methodName = event.methodCall.name
    let action = ''

    const newEvent = {
        action: action,
        txHash: event.txHash,
        user: event.fromAddress,
        method: methodName,
        assetsSent: event.assetsSent,
        assetsReceived: event?.assetsReceived
    }

    switch (methodName) {
        case 'repay':
            action = \`User repaid \${event.assetsSent[1].amount} \${event.assetsSent[1].symbol}\`
            break

        case 'deposit':
            action = \`User deposited \${event.assetsSent[0].amount} \${event.assetsSent[0].symbol}\`
            break

        case 'borrow':
            action = \`User borrowed \${event.assetsReceived[1].amount} \${event.assetsReceived[1].symbol}\`
            break

        case 'withdraw':
            action = \`User withdrew \${event.assetsReceived[0].amount} \${event.assetsReceived[0].symbol}\`
            break
    }

    newEvent.action = action

    return newEvent
}
    `,
  },
]

export async function interpretTx(decodedTx: DecodedTx, interpreter: Interpreter): Promise<Interpretation> {
  const runnable = Effect.provide(applyInterpreterInVM({ decodedTx, interpreter }), layer)

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

  const res = await interpretTx(decodedTx, interpreter)

  return res
}
