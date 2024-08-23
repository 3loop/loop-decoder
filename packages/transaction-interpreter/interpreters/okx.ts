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

export const contracts = [
  '1:0xF3dE3C0d654FDa23daD170f0f320a92172509127', // OKX Aggregation Router
  '1:0x7d0ccaa3fac1e5a943c5168b6ced828691b46b36', // OKX Router
]
