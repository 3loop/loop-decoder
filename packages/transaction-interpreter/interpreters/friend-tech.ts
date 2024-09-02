import { assetsReceived, assetsSent, displayAddress, displayAsset, getPayments } from './std.js'
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

  const netSent = getPayments({
    transfers: event.transfers,
    fromAddresses: [event.fromAddress],
  })

  const netReceived = getPayments({
    transfers: event.transfers,
    toAddresses: [event.fromAddress],
  })

  const tradeEvent = event.interactions.find((interaction) => interaction.event.eventName === 'Trade')

  if (tradeEvent && 'shareAmount' in tradeEvent.event.params && 'isBuy' in tradeEvent.event.params) {
    const shareAmount = tradeEvent.event.params.shareAmount
    const isBuy = tradeEvent.event.params.isBuy
    const subject = tradeEvent.event.params.subject as string

    if (isBuy === 'true') {
      return {
        type: 'swap',
        action:
          'Bought ' + shareAmount + ' shares' + ' of ' + displayAddress(subject) + ' for ' + displayAsset(netSent[0]),
        ...newEvent,
      }
    } else {
      return {
        type: 'swap',
        action:
          'Sold ' + shareAmount + ' shares' + ' of ' + displayAddress(subject) + ' for ' + displayAsset(netReceived[0]),
        ...newEvent,
      }
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contracts = ['8453:0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4']
