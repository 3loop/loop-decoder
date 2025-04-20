import { stringify } from './helpers/stringify.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import { Interpreter } from './types.js'
import { getInterpreter } from './interpreters.js'
import { TransactionInterpreter } from './interpreter.js'

function localEval(code: string, input: string) {
  const fn = new Function(`with(this) { ${code}; return transformEvent(${input}) }`)
  return fn.call({})
}

const make = Effect.succeed({
  // NOTE: We could export this separately to allow bundling the interpreters separately
  findInterpreter: (decodedTx: DecodedTransaction) => {
    if (!decodedTx.toAddress) return undefined

    const code = getInterpreter(decodedTx)
    if (!code) return undefined

    return {
      schema: code,
      id: `${decodedTx.chainID}:${decodedTx.toAddress}`,
    }
  },
  interpretTx: (
    decodedTx: DecodedTransaction,
    interpreter: Interpreter,
    options?: {
      interpretAsUserAddress?: string
    },
  ) =>
    Effect.sync(() => {
      // TODO: add ability to surpress warning on acknowledge
      Effect.logWarning('Using eval in production can result in security vulnerabilities. Use at your own risk.')

      let input
      if (options?.interpretAsUserAddress) {
        input = stringify({
          ...decodedTx,
          fromAddress: options.interpretAsUserAddress,
        })
      } else {
        input = stringify(decodedTx)
      }

      const result = localEval(interpreter.schema, input)
      return result
    }).pipe(Effect.withSpan('TransactionInterpreter.interpretTx')),
})

export const EvalInterpreterLive = Layer.scoped(TransactionInterpreter, make)
