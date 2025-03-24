import { displayAsset, getNetTransfers, defaultEvent } from './std.js'
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

  if (netSent.length === 1 && netReceived.length === 1) {
    return {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
    }
  }
  return newEvent
}

export const contracts = ['8453:0x00000000009726632680FB29d3F7A9734E3010E2']
