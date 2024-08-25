import { assetsReceived, assetsSent, displayPayments, processNftTransfers } from './std.js'
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

  const sell = ['takeBidSingle', 'takeBid']
  const buy = ['takeAskSinglePool', 'takeAskSingle', 'takeAsk', 'takeAskPool', 'batchBuyWithETH', 'batchBuyWithERC20s']

  if (sell.includes(methodName)) {
    const from = receivingAddresses.length > 1 ? ` to ${receivingAddresses.length} users` : ''
    return {
      type: 'transfer-nft',
      action: `Sold${numberOfNfts} for ${payment}${from}`,
      ...newEvent,
    }
  }

  if (buy.includes(methodName)) {
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
  //Blur v3
  '1:0xb2ecfE4E4D61f8790bbb9DE2D1259B9e2410CEA5',
  //Blur v2
  '1:0x39da41747a83aeE658334415666f3EF92DD0D541',
]