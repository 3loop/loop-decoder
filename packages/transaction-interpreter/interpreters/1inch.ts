import { displayAsset, getNetTransfers, isSwap, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)

  const netSent = getNetTransfers({
    transfers: event.transfers,
    fromAddresses: [event.fromAddress],
  })

  const netReceived = getNetTransfers({
    transfers: event.transfers,
    toAddresses: [event.fromAddress],
  })

  if (isSwap(event)) {
    return {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
    }
  }

  return newEvent
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
