import { assetsReceived, assetsSent, genericInterpreter, displayAddress, displayAsset, toAssetTransfer } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = genericInterpreter(event)

  const userOpEvents = event.interactions.filter((e) => e.event.eventName === 'UserOperationEvent')

  if (newEvent.type !== 'unknown') {
    return newEvent
  }

  if (userOpEvents.length === 1) {
    const userOpEvent = userOpEvents[0]
    const { sender } = userOpEvent.event.params as {
      sender: string
    }

    //detect single transfer
    const transfers = event.transfers
      .filter((t) => (t.from === sender || t.to === sender) && t.type !== 'native')
      .map(toAssetTransfer)
    if (transfers.length === 1) {
      return {
        ...newEvent,
        type: 'transfer-token',
        action: `Sent ${displayAsset(transfers[0])}`,
        assetsSent: assetsSent(event.transfers, sender),
        assetsReceived: assetsReceived(event.transfers, sender),
      }
    }

    return {
      ...newEvent,
      type: 'account-abstraction',
      action: `Account Abstraction transaction by ${displayAddress(sender)}`,
      assetsSent: assetsSent(event.transfers, sender),
      assetsReceived: assetsReceived(event.transfers, sender),
    }
  }

  if (userOpEvents.length > 1) {
    return {
      ...newEvent,
      type: 'account-abstraction',
      action: `Account Abstraction transaction by ${userOpEvents.length} addresses`,
    }
  }

  return newEvent
}

export const events = ['UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)']
