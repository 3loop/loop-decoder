import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = [
  // KyberSwap v2
  '1:0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  '8453:0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
]
