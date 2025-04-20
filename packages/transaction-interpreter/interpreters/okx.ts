import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = [
  '1:0xF3dE3C0d654FDa23daD170f0f320a92172509127', // OKX Aggregation Router
  '1:0xF3dE3C0d654FDa23daD170f0f320a92172509127', // OKX Router
]
