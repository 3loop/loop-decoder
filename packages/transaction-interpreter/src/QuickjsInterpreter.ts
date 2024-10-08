import { stringify } from './helpers/stringify.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import { Interpreter } from './types.js'
import { getInterpreter } from './interpreters.js'
import { QuickjsVM } from './quickjs.js'
import { TransactionInterpreter } from './interpreter.js'

const make = Effect.gen(function* () {
  const vm = yield* QuickjsVM

  return {
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
    interpretTx: (decodedTx: DecodedTransaction, interpreter: Interpreter) =>
      Effect.gen(function* () {
        const input = stringify(decodedTx)
        const code = interpreter.schema
        const result = yield* vm.eval(code + '\n' + 'transformEvent(' + input + ')')
        return result
      }).pipe(Effect.withSpan('TransactionInterpreter.interpretTx')),
  }
})

export const QuickjsInterpreterLive = Layer.scoped(TransactionInterpreter, make)
