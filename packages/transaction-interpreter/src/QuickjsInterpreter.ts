import { stringify } from './helpers/stringify.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { Context, Effect, Layer } from 'effect'
import { InterpretedTransaction, Interpreter } from './types.js'
import { getInterpreter } from './interpreters.js'
import { QuickjsVM } from './quickjs.js'

export interface TransactionInterpreter {
  readonly findInterpreter: (decodedTx: DecodedTx) => Interpreter | undefined
  readonly interpretTx: (
    decodedTx: DecodedTx,
    interpreter: Interpreter,
  ) => Effect.Effect<InterpretedTransaction, never, never>
}

export const TransactionInterpreter = Context.GenericTag<TransactionInterpreter>('@3loop/TransactionInterpreter')

export const make = Effect.gen(function* () {
  const vm = yield* QuickjsVM

  return {
    // NOTE: We could export this separately to allow bundling the interpreters separately
    findInterpreter: (decodedTx: DecodedTx) => {
      if (!decodedTx.toAddress) return undefined

      const code = getInterpreter(decodedTx)
      if (!code) return undefined

      return {
        schema: code,
        id: `${decodedTx.chainID}:${decodedTx.toAddress}`,
      }
    },
    interpretTx: (decodedTx: DecodedTx, interpreter: Interpreter) =>
      Effect.gen(function* () {
        const input = stringify(decodedTx)
        const code = interpreter.schema
        const result = yield* vm.eval(code + '\n' + 'transformEvent(' + input + ')')
        return result
      }).pipe(Effect.withSpan('TransactionInterpreter.interpretTx')),
  }
})

export const QuickjsInterpreterLive = Layer.scoped(TransactionInterpreter, make)
