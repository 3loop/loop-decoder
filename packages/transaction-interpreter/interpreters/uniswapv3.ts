import { assetsReceived, assetsSent } from './std.js'
import type { AssetTransfer, InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

function displayAsset(asset: AssetTransfer): string {
  return asset.amount + ' ' + asset.asset.symbol
}

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

  const hasSwap = event.traceCalls.some((call) => call.name === 'swap')

  if (hasSwap) {
    const from = displayAsset(newEvent.assetsSent[0])
    const to = displayAsset(newEvent.assetsReceived[0])

    return {
      type: 'swap',
      action: 'Swapped ' + from + ' for ' + to,
      ...newEvent,
    }
  }

  return {
    type: 'unknown',
    action: 'Unknown action',
    ...newEvent,
  }
}

export const contracts = [
  // Mainnet
  '1:0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
  '1:0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '1:0x76d631990d505e4e5b432eedb852a60897824d68',
  // Sepolia
  '11155111:0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '11155111:0x5302086a3a25d473aabbd0356eff8dd811a4d89b',
]
