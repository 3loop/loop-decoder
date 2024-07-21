import type { AssetTransfer, InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { assetsReceived, assetsSent } from './std.js'

function displayAsset(asset: AssetTransfer): string {
  return asset.amount + ' ' + asset.asset.symbol
}
export function transformEvent(tx: DecodedTx): InterpretedTransaction {
  const methodName = tx.methodCall.name

  const event = {
    chain: tx.chainID,
    txHash: tx.txHash,
    user: { address: tx.fromAddress, name: null },
    method: methodName,
    assetsSent: assetsSent(tx.transfers, tx.fromAddress),
    assetsReceived: assetsReceived(tx.transfers, tx.fromAddress),
  }

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

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...event,
  }
}

export const contracts = ['1:0xb8901acb165ed027e32754e0ffe830802919727f']
