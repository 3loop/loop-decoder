import type { DecodedTx } from '@3loop/transaction-decoder'
import { Context, Effect } from 'effect'
import { InterpretedTransaction, Interpreter } from './types.js'
import { InterpreterError } from './quickjs.js'

export interface TransactionInterpreter {
  readonly findInterpreter: (decodedTx: DecodedTx) => Interpreter | undefined
  readonly interpretTx: (
    decodedTx: DecodedTx,
    interpreter: Interpreter,
  ) => Effect.Effect<InterpretedTransaction, InterpreterError, never>
}

export const TransactionInterpreter = Context.GenericTag<TransactionInterpreter>('@3loop/TransactionInterpreter')
