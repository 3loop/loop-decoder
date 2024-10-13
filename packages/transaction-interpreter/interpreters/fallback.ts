import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { categorizedDefaultEvent } from './std.js'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = categorizedDefaultEvent(event)

  return newEvent
}
