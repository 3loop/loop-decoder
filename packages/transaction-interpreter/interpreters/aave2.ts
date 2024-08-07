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
    case 'repay':
      return {
        type: 'repay-loan',
        action: 'User repaid ' + newEvent.assetsSent[1]?.amount + ' ' + newEvent.assetsSent[1]?.asset.symbol,
        ...newEvent,
      }

    case 'deposit':
      return {
        type: 'deposit-collateral',
        action: 'User deposited ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.asset.symbol,
        ...newEvent,
      }

    case 'borrow':
      return {
        type: 'borrow',
        action: 'User borrowed ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.asset.symbol,
        ...newEvent,
      }

    case 'withdraw':
      return {
        type: 'withdraw-collateral',
        action: 'User withdrew ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.asset.symbol,
        ...newEvent,
      }
  }

  return {
    ...newEvent,
    type: 'unknown',
    action: 'Unknown action',
  }
}

export const contracts = ['1:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9']
