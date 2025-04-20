import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = [
  '1:0x888888888889758F76e7103c6CbF23ABbF58F946', // Pendle Router v4
]
