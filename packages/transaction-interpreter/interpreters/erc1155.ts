import { assetsReceived, assetsSent } from './std.js'
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

  switch (methodName) {
    case 'setApprovalForAll': {
      const nftName = event?.contractName ? event?.contractName + ' ' : ''
      const approvalValue = event.methodCall?.arguments?.[1]?.value

      if (approvalValue === 'true') {
        return {
          type: 'approve-nft',
          action: `Approved all NFTs ${nftName}to be spent`,
          ...newEvent,
        }
      } else {
        return {
          type: 'approve-nft',
          action: `Revoked approval for all NFTs ${nftName}to be spent`,
          ...newEvent,
        }
      }
    }
    case 'safeTransferFrom': {
      const from = (event.methodCall?.arguments?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenId = event.methodCall?.arguments?.[2]?.value

      if (!name || !tokenId) break

      return {
        type: 'transfer-nft',
        action: `Sent ${name} #${tokenId}`,
        ...newEvent,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
    case 'safeBatchTransferFrom': {
      const from = (event.methodCall?.arguments?.[0]?.value as string) || ''
      const name = event.contractName
      const tokenIds = event.methodCall?.arguments?.[2]?.value as string[]

      if (!name || !tokenIds) break

      return {
        type: 'transfer-nft',
        action: 'Sent ' + name + ' ' + tokenIds.map((id) => `#${id}`).join(', '),
        ...newEvent,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contractType = 'erc1155'
