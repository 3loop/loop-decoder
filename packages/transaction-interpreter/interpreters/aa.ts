import { categorizedDefaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = categorizedDefaultEvent(event)
  return newEvent
}

export const contracts = ['1:0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789']
