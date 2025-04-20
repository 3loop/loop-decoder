import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = [
  '1:0x3328f7f4a1d1c57c35df56bbf0c9dcafca309c49',
  '8453:0x1fba6b0bbae2b74586fba407fb45bd4788b7b130',
]
