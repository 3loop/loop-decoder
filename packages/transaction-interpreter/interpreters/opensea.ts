import { assetsReceived, assetsSent, processNftTransfers, displayPayments } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name ?? 'unknown'

  const newEvent: Omit<InterpretedTransaction, 'action' | 'type'> = {
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: methodName,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
  }

  const { sendingAddresses, receivingAddresses, nftTransfers, erc20Payments, nativePayments } = processNftTransfers(
    event.transfers,
  )

  if (nftTransfers.length === 0) {
    return {
      type: 'unknown',
      action: 'Unknown action',
      ...newEvent,
    }
  }

  const collection = nftTransfers[0].name ?? ''
  const numberOfNfts = nftTransfers.length > 1 ? ` ${nftTransfers.length} ${collection} NFTS` : ` 1 ${collection} NFT`
  const payment = displayPayments(erc20Payments, nativePayments)

  if (sendingAddresses.includes(event.fromAddress.toLowerCase())) {
    const from = receivingAddresses.length > 1 ? ` to ${receivingAddresses.length} users` : ''
    return {
      type: 'transfer-nft',
      action: `Sold${numberOfNfts} for ${payment}${from}`,
      ...newEvent,
    }
  }

  if (receivingAddresses.includes(event.fromAddress.toLowerCase())) {
    const from = sendingAddresses.length > 1 ? ` from ${sendingAddresses.length} users` : ''
    return {
      type: 'transfer-nft',
      action: `Bought${numberOfNfts} for ${payment}${from}`,
      ...newEvent,
    }
  }

  return {
    type: 'unknown',
    action: 'Unknown action',
    ...newEvent,
  }
}

export const contracts = [
  //Seaport 1.6
  '1:0x0000000000000068F116a894984e2DB1123eB395',
  //Seaport 1.5
  '1:0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
]
