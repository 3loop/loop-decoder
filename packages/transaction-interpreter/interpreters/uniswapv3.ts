import { displayAsset, defaultEvent, getNetTransfers, isSwap } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)
  const hasSwap = event.traceCalls.some((call) => call.name === 'swap')

  if (hasSwap && isSwap(event)) {
    const netSent = getNetTransfers({
      transfers: event.transfers,
      fromAddresses: [event.fromAddress],
    })

    const netReceived = getNetTransfers({
      transfers: event.transfers,
      toAddresses: [event.fromAddress],
    })

    return {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
    }
  }

  return newEvent
}

export const contracts = [
  //Universal Router
  '1:0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '1:0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
  '8453:0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '8453:0xeC8B0F7Ffe3ae75d7FfAb09429e3675bb63503e4',
  '8453:0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
  '8453:0x2626664c2603336e57b271c5c0b26f421741e481',
  '11155111:0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '11155111:0x5302086a3a25d473aabbd0356eff8dd811a4d89b',
]
