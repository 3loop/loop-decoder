import { assetsReceived, assetsSent, genericInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = genericInterpreter(event)

  switch (methodName) {
    case 'setApprovalForAll': {
      const nftName = event?.contractName ? event?.contractName + ' ' : ''
      const approvalValue = event.methodCall?.params?.[1]?.value

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
      const from = (event.methodCall?.params?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenId = event.methodCall?.params?.[2]?.value

      if (!name || !tokenId) break

      return {
        ...newEvent,
        type: 'transfer-nft',
        action: `Sent ${name} #${tokenId}`,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
    case 'safeBatchTransferFrom': {
      const from = (event.methodCall?.params?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenIds = event.methodCall?.params?.[2]?.value as string[]

      if (!name || !tokenIds) break

      return {
        ...newEvent,
        type: 'transfer-nft',
        action: 'Sent ' + name + ' ' + tokenIds.map((id) => `#${id}`).join(', '),
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
  }

  return newEvent
}

export const contractType = 'erc1155'
