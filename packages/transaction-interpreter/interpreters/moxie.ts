import { assetsReceived, assetsSent, displayAsset, formatNumber, NULL_ADDRESS } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name

  const newEvent: Omit<InterpretedTransaction, 'action' | 'type' | 'assetsSent' | 'assetsReceived'> = {
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: methodName,
  }

  const purchaseOrSaleEvent = event.interactions.find(
    (i) => i.event.eventName === 'SubjectSharePurchased' || i.event.eventName === 'SubjectShareSold',
  )

  const eventType = purchaseOrSaleEvent?.event.eventName === 'SubjectSharePurchased' ? 'buy' : 'sell'

  if (purchaseOrSaleEvent) {
    const params = purchaseOrSaleEvent.event.params as {
      _spender: string
      _beneficiary: string
      _buyToken: string
      _buyAmount: string
      _sellToken: string
      _sellAmount: string
    }
    const spender = params._spender
    const beneficiary = params._beneficiary
    const sent = assetsSent(event.transfers, spender)
    const received = assetsReceived(event.transfers, beneficiary)

    const isSwap = sent.length === 1 && received.length === 1
    const isBurn = beneficiary === NULL_ADDRESS

    if (eventType === 'buy' && isSwap) {
      return {
        type: 'swap',
        action: `Bought ${formatNumber(received[0].amount)} shares of ${received[0].asset?.name} for ${displayAsset(
          sent[0],
        )}`,
        ...newEvent,
        assetsSent: sent,
        assetsReceived: received,
      }
    }

    if (eventType === 'sell' && isSwap) {
      return {
        type: 'swap',
        action: `Sold ${formatNumber(sent[0].amount)} shares of ${sent[0].asset?.name} for ${displayAsset(
          received[0],
        )}`,
        ...newEvent,
        assetsSent: sent,
        assetsReceived: received,
      }
    }

    if (eventType === 'buy' && isBurn) {
      const buyTokenAddress = params._buyToken
      const buyTokenMetadata = event.addressesMeta[buyTokenAddress as keyof typeof event.addressesMeta]

      return {
        type: 'burn',
        action: `Burned ${displayAsset(sent[0])} for ${buyTokenMetadata?.contractName} fan holders`,
        ...newEvent,
        assetsSent: sent,
        assetsReceived: [],
      }
    }

    return {
      type: 'unknown',
      action: `Called method '${methodName}'`,
      ...newEvent,
      assetsSent: sent,
      assetsReceived: received,
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
    ...newEvent,
  }
}

export const events = [
  'SubjectShareSold(address,address,uint256,address,address,uint256,address)',
  'SubjectSharePurchased(address,address,uint256,address,address,uint256,address)',
]
