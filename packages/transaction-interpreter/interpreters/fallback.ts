import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { assetsSent, displayAsset, defaultEvent, filterZeroTransfers } from './std.js'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const newEvent = defaultEvent(event)
  const transfers = filterZeroTransfers(event.transfers)

  if (transfers.length === 1) {
    const fromAddress = transfers[0].from
    const assetSent = assetsSent(event.transfers, fromAddress)
    return {
      ...newEvent,
      type: 'transfer-token',
      action: `Sent ${displayAsset(assetSent[0])}`,
      assetsSent: assetSent,
    }
  }

  return newEvent
}
