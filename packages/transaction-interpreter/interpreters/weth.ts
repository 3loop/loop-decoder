import { defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = defaultEvent(event)

  switch (methodName) {
    case 'deposit':
      return {
        ...newEvent,
        type: 'wrap',
        action: 'Wrapped ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
      }
    case 'withdraw':
      return {
        ...newEvent,
        type: 'unwrap',
        action: 'Unwrapped ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.asset.symbol,
      }
    case 'approve': {
      const approvalInteraction = event.interactions.find((i) => i.event.eventName === 'Approval')

      return {
        ...newEvent,
        type: 'approve-token',
        action: 'Approved ' + approvalInteraction?.contractSymbol,
      }
    }
    case 'transfer':
      return {
        ...newEvent,
        type: 'transfer-token',
        action: 'Sent ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
      }
  }

  return newEvent
}

export const contracts = [
  '1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '8453:0x4200000000000000000000000000000000000006',
]
