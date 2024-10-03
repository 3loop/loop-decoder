import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { displayAsset, defaultEvent } from './std.js'

export function transformEvent(tx: DecodedTx): InterpretedTransaction {
  const methodName = tx.methodCall.name
  const userAddress = tx.methodCall.arguments.find((arg) => arg.name === 'recipient')?.value as string
  const event = defaultEvent(tx)

  if (userAddress) {
    switch (methodName) {
      case 'bondWithdrawal':
        return {
          ...event,
          type: 'receive-from-bridge',
          action: 'Received ' + displayAsset(event.assetsReceived[0]) + ' from bridge',
        }
      case 'sendToL2':
        return {
          ...event,
          type: 'send-to-bridge',
          action: 'Sent ' + displayAsset(event.assetsSent[0]) + ' to bridge',
        }
    }
  }

  return event
}

export const contracts = ['1:0xb8901acb165ed027e32754e0ffe830802919727f']
