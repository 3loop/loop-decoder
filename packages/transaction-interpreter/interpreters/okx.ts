import { displayAsset, getPayments, isSwap, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
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

export const contracts = [
  '1:0xF3dE3C0d654FDa23daD170f0f320a92172509127', // OKX Aggregation Router
  '1:0xF3dE3C0d654FDa23daD170f0f320a92172509127', // OKX Router
]
