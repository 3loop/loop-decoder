import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { assetsReceived, assetsSent, displayAsset, NULL_ADDRESS } from './std.js'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name

  const newEvent: Omit<InterpretedTransaction, 'action' | 'type' | 'assetsSent' | 'assetsReceived'> = {
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: methodName,
  }

  const transfers = event.transfers.filter((t) => t.from !== NULL_ADDRESS && t.to !== NULL_ADDRESS)

  if (transfers.length === 1) {
    const fromAddress = transfers[0].from
    const assetSent = assetsSent(transfers, fromAddress)
    return {
      type: 'unknown',
      action: `Sent ${displayAsset(assetSent[0])}`,
      ...newEvent,
      assetsReceived: [],
      assetsSent: assetSent,
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
  }
}
