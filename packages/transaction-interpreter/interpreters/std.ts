import type { AssetTransfer } from '@/types.js'
import type { Asset } from '@3loop/transaction-decoder'

export function assetsSent(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  return transfers
    .filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase())
    .map((t) => {
      return {
        from: { address: t.from, name: null },
        to: { address: t.to, name: null },
        amount: t.amount ?? '0',
        asset: { address: t.address, name: t.name, symbol: t.symbol, type: t.type, tokenId: t.tokenId },
      }
    })
}

export function assetsReceived(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  return transfers
    .filter((t) => t.to.toLowerCase() === fromAddress.toLowerCase())
    .map((t) => {
      return {
        from: { address: t.from, name: null },
        to: { address: t.to, name: null },
        amount: t.amount ?? '0',
        asset: { address: t.address, name: t.name, symbol: t.symbol, type: t.type, tokenId: t.tokenId },
      }
    })
}
