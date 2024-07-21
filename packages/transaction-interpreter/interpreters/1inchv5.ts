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

  switch (methodName) {
    case 'uniswapV3Swap':
    case 'swap':
    case 'unoswap':
      return {
        type: 'swap',
        action: 'Swapped ' + displayAsset(newEvent.assetsSent[0]) + ' for ' + displayAsset(newEvent.assetsReceived[0]),
        ...newEvent,
      }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contracts = ['1:0x1111111254EEB25477B68fb85Ed929f73A960582']
