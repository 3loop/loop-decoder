import type { Asset, DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx) {
  function assetsSent(transfers: Asset[], fromAddress: string) {
    return transfers.filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase())
  }

  function assetsReceived(transfers: Asset[], fromAddress: string) {
    return transfers.filter((t) => t.to.toLowerCase() === fromAddress.toLowerCase())
  }

  const methodName = event.methodCall.name

  const newEvent = {
    action: '',
    txHash: event.txHash,
    user: event.fromAddress,
    method: methodName,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
  }

  switch (methodName) {
    case 'repay':
      newEvent.action = 'User repaid ' + newEvent.assetsSent[1]?.amount + ' ' + newEvent.assetsSent[1]?.symbol
      break

    case 'deposit':
      newEvent.action = 'User deposited ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.symbol
      break

    case 'borrow':
      newEvent.action = 'User borrowed ' + newEvent.assetsReceived[1]?.amount + ' ' + newEvent.assetsReceived[1]?.symbol
      break

    case 'withdraw':
      newEvent.action = 'User withdrew ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.symbol
      break
  }

  return newEvent
}

export const contracts = ['1:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9']
