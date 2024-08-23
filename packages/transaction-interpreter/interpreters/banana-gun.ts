import { assetsReceived, assetsSent, displayAsset, getPayments, isSwap } from './std.js'
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
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
      ...newEvent,
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contracts = ['1:0x3328f7f4a1d1c57c35df56bbf0c9dcafca309c49']
