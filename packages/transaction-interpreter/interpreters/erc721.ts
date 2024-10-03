import { assetsReceived, assetsSent, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = defaultEvent(event)

  switch (methodName) {
    case 'approve': {
      const nftName = event.contractName || ''
      const tokenId = event.methodCall?.arguments?.[1]?.value || ''

      return {
        ...newEvent,
        type: 'approve-nft',
        action: `Approved NFT ${nftName ? `${nftName} ` : ''}${tokenId ? `#${tokenId} ` : ''}to be spent`,
      }
    }

    case 'setApprovalForAll': {
      const nftName = event?.contractName ? event?.contractName + ' ' : ''
      const approvalValue = event.methodCall?.arguments?.[1]?.value

      if (approvalValue === 'true') {
        return {
          ...newEvent,
          type: 'approve-nft',
          action: `Approved all NFTs ${nftName}to be spent`,
        }
      } else {
        return {
          ...newEvent,
          type: 'approve-nft',
          action: `Revoked approval for all NFTs ${nftName}to be spent`,
        }
      }
    }
    case 'safeTransferFrom': {
      const from = (event.methodCall?.arguments?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenId = event.methodCall?.arguments?.[2]?.value

      if (!name || !tokenId) break

      return {
        ...newEvent,
        type: 'transfer-nft',
        action: `Sent ${name} #${tokenId}`,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
    case 'transferFrom': {
      const from = (event.methodCall?.arguments?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenId = event.methodCall?.arguments?.[2]?.value

      if (!name || !tokenId) break

      return {
        ...newEvent,
        type: 'transfer-nft',
        action: `Sent ${name} #${tokenId}`,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
  }

  return newEvent
}

export const contractType = 'erc721'
