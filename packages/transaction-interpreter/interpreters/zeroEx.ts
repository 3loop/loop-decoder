import { assetsReceived, categorizedDefaultEvent, displayAsset, getNetTransfers } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = categorizedDefaultEvent(event)
  const recipient = event.fromAddress
  const contractAddress = event.toAddress

  if (!contractAddress) return newEvent

  const netSent = getNetTransfers({
    transfers: event.transfers,
    fromAddresses: [event.fromAddress],
    type: ['ERC20', 'native'],
  })

  const netReceived = getNetTransfers({
    transfers: event.transfers,
    toAddresses: [recipient],
    fromAddresses: [contractAddress],
    type: ['ERC20', 'native'],
  })

  //filter the same tokne from netReceived (to filter out received fees)
  const sentTokens = netSent.map((t) => t.asset.address)
  const filteredNetReceived = netReceived.filter((t) => !sentTokens.includes(t.asset.address))

  if (netSent.length === 1 && filteredNetReceived.length === 1) {
    return {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(filteredNetReceived[0]),
      assetsReceived: assetsReceived(
        event.transfers.filter((t) => filteredNetReceived.some((r) => r.asset.address === t.address)),
        recipient,
      ),
    }
  }

  return newEvent
}

export const contracts = [
  //Exchange Proxy
  '1:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '10:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '42161:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
  '8453:0xDef1C0ded9bec7F1a1670819833240f027b25EfF',

  //Settlers
  '8453:0xbc3c5ca50b6a215edf00815965485527f26f5da8',
]
