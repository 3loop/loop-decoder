import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { assetsReceived, assetsSent, displayAsset } from './std.js'

export function transformEvent(tx: DecodedTx): InterpretedTransaction {
  const methodName = tx.methodCall.name
  const userAddress = tx.methodCall.arguments.find((arg) => arg.name === 'recipient')?.value as string

  const event = {
    chain: tx.chainID,
    txHash: tx.txHash,
    user: { address: userAddress, name: null },
    method: methodName,
    assetsSent: assetsSent(tx.transfers, userAddress),
    assetsReceived: assetsReceived(tx.transfers, userAddress),
  }

  if (userAddress) {
    switch (methodName) {
      case 'bondWithdrawal':
        return {
          type: 'receive-from-bridge',
          action: 'Received ' + displayAsset(event.assetsReceived[0]) + ' from bridge',
          ...event,
        }
      case 'sendToL2':
        return {
          type: 'send-to-bridge',
          action: 'Sent ' + displayAsset(event.assetsSent[0]) + ' to bridge',
          ...event,
        }
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...event,
  }
}

export const contracts = ['1:0xb8901acb165ed027e32754e0ffe830802919727f']
