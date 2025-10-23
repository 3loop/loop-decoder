import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { Context, Effect } from 'effect'
import { InterpretedTransaction, Interpreter, InterpreterOptions } from './types.js'
import { InterpreterError } from './quickjs.js'

export interface TransactionInterpreter {
  readonly findInterpreter: (decodedTx: DecodedTransaction) => Interpreter | undefined

  readonly interpretTx: (
    decodedTx: DecodedTransaction,
    interpreter: Interpreter,
    options?: {
      interpretAsUserAddress?: string
    },
  ) => Effect.Effect<InterpretedTransaction, InterpreterError, never>

  readonly interpretTransaction: (
    decodedTransaction: DecodedTransaction,
    interpreter: Interpreter,
    options?: InterpreterOptions,
  ) => Effect.Effect<InterpretedTransaction, InterpreterError, never>
}

export const TransactionInterpreter = Context.GenericTag<TransactionInterpreter>('@3loop/TransactionInterpreter')
