import { genericSwapInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = ['8453:0x6cb442acf35158d5eda88fe602221b67b400be3e']
