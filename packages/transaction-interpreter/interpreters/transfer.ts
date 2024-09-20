import { assetsReceived, assetsSent, displayAsset, NULL_ADDRESS } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

/**
 * Fallback interpretator to display transfers.
 */
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
      type: 'transfer-token',
      action: `Sent ${displayAsset(assetSent[0])}`,
      ...newEvent,
      assetsReceived: [],
      assetsSent: assetSent,
    }
  }

  // TODO: handle multiple transfers

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
    assetsReceived: assetsReceived(transfers, event.fromAddress),
    assetsSent: assetsSent(transfers, event.fromAddress),
  }
}

export const contractType = 'transfer'
