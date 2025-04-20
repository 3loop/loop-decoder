import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { genericInterpreter } from './std.js'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericInterpreter(event)
}
