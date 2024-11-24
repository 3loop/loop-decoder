import { processNftTransfers, displayAssets, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)

  const { sendingAddresses, receivingAddresses, nftTransfers, erc20Payments, nativePayments } = processNftTransfers(
    event.transfers,
  )

  if (nftTransfers.length === 0) {
    return newEvent
  }

  const collection = nftTransfers[0].name ?? ''
  const numberOfNfts = nftTransfers.length > 1 ? ` ${nftTransfers.length} ${collection} NFTS` : ` 1 ${collection} NFT`
  const payment = displayAssets([...erc20Payments, ...nativePayments])

  if (sendingAddresses.includes(event.fromAddress.toLowerCase())) {
    const from = receivingAddresses.length > 1 ? ` to ${receivingAddresses.length} users` : ''
    return {
      ...newEvent,
      type: 'transfer-nft',
      action: `Sold${numberOfNfts} for ${payment}${from}`,
    }
  }

  if (receivingAddresses.includes(event.fromAddress.toLowerCase())) {
    const from = sendingAddresses.length > 1 ? ` from ${sendingAddresses.length} users` : ''
    return {
      ...newEvent,
      type: 'transfer-nft',
      action: `Bought${numberOfNfts} for ${payment}${from}`,
    }
  }

  return newEvent
}

export const contracts = [
  //Seaport 1.6
  '1:0x0000000000000068F116a894984e2DB1123eB395',
  '8453:0x0000000000000068F116a894984e2DB1123eB395',
  //Seaport 1.5
  '1:0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
  '8453:0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
]
