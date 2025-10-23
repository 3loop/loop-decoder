import { stringify } from './helpers/stringify.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import { Interpreter, InterpreterOptions } from './types.js'
import { getInterpreter } from './interpreters.js'
import { TransactionInterpreter } from './interpreter.js'
import { InterpreterError } from './quickjs.js'

async function localEval(code: string, input: string) {
  const fn = new Function(`with(this) { ${code}; return transformEvent(${input}) }`)
  const result = fn.call({})

  // Check if result is a promise and await it
  if (result && typeof result.then === 'function') {
    return await result
  }

  return result
}

const make = {
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
    decodedTransaction: DecodedTransaction,
    interpreter: Interpreter,
    options?: {
      interpretAsUserAddress?: string
    },
  ) =>
    Effect.tryPromise({
      try: async () => {
        // TODO: add ability to surpress warning on acknowledge
        Effect.logWarning('Using eval in production can result in security vulnerabilities. Use at your own risk.')
        const input = stringify(decodedTransaction) + (options ? `,${stringify(options)}` : '')
        const result = await localEval(interpreter.schema, input)
        return result
      },
      catch: (error) => new InterpreterError(error),
    }).pipe(Effect.withSpan('TransactionInterpreter.interpretTx')),

  interpretTransaction: (
    decodedTransaction: DecodedTransaction,
    interpreter: Interpreter,
    options?: InterpreterOptions,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // TODO: add ability to surpress warning on acknowledge
        Effect.logWarning('Using eval in production can result in security vulnerabilities. Use at your own risk.')
        const input = stringify(decodedTransaction) + (options ? `,${stringify(options)}` : '')
        const result = await localEval(interpreter.schema, input)
        return result
      },
      catch: (error) => new InterpreterError(error),
    }).pipe(Effect.withSpan('TransactionInterpreter.interpretTransaction')),
}

export const EvalInterpreterLive = Layer.scoped(TransactionInterpreter, Effect.succeed(make))
