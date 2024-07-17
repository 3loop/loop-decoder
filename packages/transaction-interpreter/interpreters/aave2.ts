import { InterpretedTransaction, AssetTransfer } from '@/types.js'
import type { DecodedTx, Asset } from '@3loop/transaction-decoder'

// TODO: Create an stdlib and inject it at compile time
export function assetsSent(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  return transfers
    .filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase())
    .map((t) => {
      return {
        from: { address: t.from, name: null },
        to: { address: t.to, name: null },
        amount: t.amount ?? '0',
        asset: { address: t.address, name: t.name, symbol: t.symbol, type: t.type },
      }
    })
}

export function assetsReceived(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  return transfers
    .filter((t) => t.to.toLowerCase() === fromAddress.toLowerCase())
    .map((t) => {
      return {
        from: { address: t.from, name: null },
        to: { address: t.to, name: null },
        amount: t.amount ?? '0',
        asset: { address: t.address, name: t.name, symbol: t.symbol, type: t.type },
      }
    })
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
