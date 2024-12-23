import { assetsReceived, categorizedDefaultEvent, displayAsset, getNetTransfers, filterTransfers } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = categorizedDefaultEvent(event)

  if (newEvent.type !== 'unknown') return newEvent

  if (!event.toAddress) return newEvent

  const filteredTransfers = filterTransfers(event.transfers, {
    excludeZero: true,
    excludeNull: true,
    sumUpRepeated: true,
  })

  const netSent = getNetTransfers({
    transfers: filteredTransfers,
    fromAddresses: [event.fromAddress],
    type: ['ERC20', 'native'],
  })

  const sentTokens = netSent.map((t) => t.asset.address)

  let netReceived

  const buyToken = event.methodCall?.params?.[0]?.components?.find((c) => c.name === 'buyToken') as
    | { value: string }
    | undefined

  if (buyToken) {
    netReceived = getNetTransfers({
      transfers: filteredTransfers.filter((t) => t.address === buyToken.value),
      type: ['ERC20', 'native'],
    })
  } else {
    netReceived = getNetTransfers({
      transfers: filteredTransfers,
      toAddresses: [event.toAddress],
      type: ['ERC20', 'native'],
    }).filter((t) => !sentTokens.includes(t.asset.address))
  }

  const receivedTokens = netReceived.map((t) => t.asset.address)

  if (netSent.length === 1 && netReceived.length === 1) {
    return {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
      assetsReceived: assetsReceived(
        filteredTransfers.filter((t) => receivedTokens.includes(t.address)),
        event.fromAddress,
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
