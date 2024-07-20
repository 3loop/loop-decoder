import { assetsReceived, assetsSent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent: Omit<InterpretedTransaction, 'action' | 'type'> = {
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: methodName,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
  }

  switch (methodName) {
    case 'deposit':
      return {
        type: 'wrap',
        action: 'Wrapped ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
        ...newEvent,
      }
    case 'withdraw':
      return {
        type: 'unwrap',
        action: 'Unwrapped ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.asset.symbol,
        ...newEvent,
      }
    case 'approve':
      return {
        type: 'approve',
        action: 'Approved ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
        ...newEvent,
      }
    case 'transfer':
      return {
        type: 'transfer',
        action: 'Transferred ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
        ...newEvent,
      }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contracts = ['1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
