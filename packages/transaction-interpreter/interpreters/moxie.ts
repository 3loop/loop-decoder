import {
  displayAsset,
  formatNumber,
  NULL_ADDRESS,
  defaultEvent,
  toAssetTransfer,
  assetsSent,
  assetsReceived,
} from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

/**
 * Moxie is a community-governed Farcaster economic engine on the Base blockchain. It aims to grow the
 * Farcaster GDP and help members and communities prosper. The protocol facilitates efficient onchain
 * economies through fan tokens, rewards, earning mechanisms, and automated payouts. Moxie enables
 * paid memberships, monetization, member-only features, Farcaster-native advertising, and revenue sharing.
 *
 * For more information, see: https://build.moxie.xyz/the-moxie-protocol/moxie-protocol
 * and https://developer.moxie.xyz/
 */

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = defaultEvent(event)

  const purchaseOrSaleEvent = event.interactions.find(
    (i) => i.event.eventName === 'SubjectSharePurchased' || i.event.eventName === 'SubjectShareSold',
  )

  const eventType = purchaseOrSaleEvent?.event.eventName === 'SubjectSharePurchased' ? 'buy' : 'sell'

  if (purchaseOrSaleEvent) {
    const { _spender, _beneficiary, _buyToken, _sellToken } = purchaseOrSaleEvent.event.params as {
      _spender: string
      _beneficiary: string
      _buyToken: string
      _sellToken: string
    }
    const sold = event.transfers.filter((t) => t.address === _sellToken && t.from === _spender).map(toAssetTransfer)
    const bougt = event.transfers.filter((t) => t.address === _buyToken && t.to === _beneficiary).map(toAssetTransfer)
    const isBurn = _beneficiary === NULL_ADDRESS
    const isSwap = sold.length === 1 && bougt.length === 1

    if (eventType === 'buy' && isSwap) {
      return {
        ...newEvent,
        type: 'swap',
        action: `Bought ${formatNumber(bougt[0].amount)} Fan Tokens of ${bougt[0].asset?.name} for ${displayAsset(
          sold[0],
        )}`,
        assetsSent: assetsSent(event.transfers, _spender),
        assetsReceived: assetsReceived(event.transfers, _beneficiary),
      }
    }

    if (eventType === 'sell' && isSwap) {
      return {
        ...newEvent,
        type: 'swap',
        action: `Sold ${formatNumber(sold[0].amount)} Fan Tokens of ${sold[0].asset?.name} for ${displayAsset(
          bougt[0],
        )}`,
        assetsSent: assetsSent(event.transfers, _spender),
        assetsReceived: assetsReceived(event.transfers, _beneficiary),
      }
    }

    if (eventType === 'buy' && isBurn) {
      const buyTokenAddress = _buyToken
      const buyTokenMetadata = event.addressesMeta[buyTokenAddress as keyof typeof event.addressesMeta]

      return {
        ...newEvent,
        type: 'burn',
        action: `Burned ${displayAsset(sold[0])} for ${buyTokenMetadata?.contractName} Fan Tokens holders`,
        assetsSent: assetsSent(event.transfers, _spender),
        assetsReceived: [],
      }
    }

    return {
      ...newEvent,
      type: 'unknown',
      action: `Called method '${methodName}'`,
      assetsSent: assetsSent(event.transfers, _spender),
      assetsReceived: assetsReceived(event.transfers, _beneficiary),
    }
  }

  return newEvent
}

export const events = [
  'SubjectShareSold(address,address,uint256,address,address,uint256,address)',
  'SubjectSharePurchased(address,address,uint256,address,address,uint256,address)',
]
