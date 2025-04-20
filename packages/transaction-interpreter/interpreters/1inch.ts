import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { genericSwapInterpreter } from './std.js'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return genericSwapInterpreter(event)
}

export const contracts = [
  // 1inchv6
  '1:0x111111125421cA6dc452d289314280a0f8842A65',
  '8453:0x111111125421cA6dc452d289314280a0f8842A65',
  // 1inchv5
  '1:0x1111111254EEB25477B68fb85Ed929f73A960582',
  '8453:0x1111111254EEB25477B68fb85Ed929f73A960582',
  // 1inchv4
  '1:0x1111111254fb6c44bAC0beD2854e76F90643097d',
]
