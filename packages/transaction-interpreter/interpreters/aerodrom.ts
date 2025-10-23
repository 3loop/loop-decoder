import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '../src/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = []
