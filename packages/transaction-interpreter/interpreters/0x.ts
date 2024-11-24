import { categorizedDefaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = categorizedDefaultEvent(event)

  return newEvent
}

export const contracts = [
  //Exchange Proxy
  '1:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '10:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '42161:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '8453:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
]
