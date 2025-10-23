import { stringify } from './helpers/stringify.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import { Interpreter, InterpreterOptions } from './types.js'
import { getInterpreter } from './interpreters.js'
import { QuickjsVM } from './quickjs.js'
import { TransactionInterpreter } from './interpreter.js'

const make = Effect.gen(function* () {
  const vm = yield* QuickjsVM

  return {
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
      decodedTransaction: DecodedTransaction,
      interpreter: Interpreter,
      options?: { interpretAsUserAddress?: string },
    ) =>
      Effect.gen(function* () {
        const input = stringify(decodedTransaction) + (options ? `,${stringify(options)}` : '')
        const code = interpreter.schema + '\n' + 'transformEvent(' + input + ')'
        const result = yield* vm.eval(code)
        return result
      }).pipe(Effect.withSpan('TransactionInterpreter.interpretTx')),

    interpretTransaction: (
      decodedTransaction: DecodedTransaction,
      interpreter: Interpreter,
      options?: InterpreterOptions,
    ) =>
      Effect.gen(function* () {
        const input = stringify(decodedTransaction) + (options ? `,${stringify(options)}` : '')
        const code = interpreter.schema + '\n' + 'transformEvent(' + input + ')'
        const result = yield* vm.eval(code)
        return result
      }).pipe(Effect.withSpan('TransactionInterpreter.interpretTransaction')),
  }
})

export const QuickjsInterpreterLive = Layer.scoped(TransactionInterpreter, make)
