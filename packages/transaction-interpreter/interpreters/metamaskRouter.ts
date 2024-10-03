import { displayAsset, getPayments, isSwap, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const newEvent = defaultEvent(event)

  const netSent = getPayments({
    transfers: event.transfers,
    fromAddresses: [event.fromAddress],
  })

  const netReceived = getPayments({
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

export const contracts = ['1:0x881D40237659C251811CEC9c364ef91dC08D300C']
