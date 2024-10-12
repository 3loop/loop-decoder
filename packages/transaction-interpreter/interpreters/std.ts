import type { AssetTransfer, InterpretedTransaction, Payment } from '@/types.js'
import { Asset, DecodedTransaction } from '@3loop/transaction-decoder'

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

export function filterZeroTransfers(transfers: Asset[]): Asset[] {
  return transfers.filter((t) => (t.amount && t.amount !== '0') || !t.amount)
}

export function filterNullTransfers(transfers: Asset[]): Asset[] {
  return transfers.filter((t) => t.from !== NULL_ADDRESS && t.to !== NULL_ADDRESS)
}

export function toAssetTransfer(transfer: Asset): AssetTransfer {
  return {
    from: { address: transfer.from, name: null },
    to: { address: transfer.to, name: null },
    amount: transfer.amount ?? '0',
    asset: {
      address: transfer.address,
      name: transfer.name,
      symbol: transfer.symbol,
      type: transfer.type,
      tokenId: transfer.tokenId,
    },
  }
}

export function assetsSent(transfers: Asset[], address: string): AssetTransfer[] {
  let filteredTransfers = filterZeroTransfers(transfers)

  if (address !== NULL_ADDRESS) {
    filteredTransfers = filterNullTransfers(filteredTransfers)
  }

  return filteredTransfers.filter((t) => t.from.toLowerCase() === address.toLowerCase()).map(toAssetTransfer)
}

export function assetsReceived(transfers: Asset[], address: string): AssetTransfer[] {
  let filteredTransfers = filterZeroTransfers(transfers)

  if (address !== NULL_ADDRESS) {
    filteredTransfers = filterNullTransfers(filteredTransfers)
  }

  return filteredTransfers
    .filter((t) => t.to.toLowerCase() === address.toLowerCase())
    .map((t) => {
      return {
        from: { address: t.from, name: null },
        to: { address: t.to, name: null },
        amount: t.amount ?? '0',
        asset: { address: t.address, name: t.name, symbol: t.symbol, type: t.type, tokenId: t.tokenId },
      }
    })
}

export function displayAddress(address: string): string {
  return address.slice(0, 6) + '...' + address.slice(-4)
}

export function isSwap(event: DecodedTransaction): boolean {
  if (event.transfers.some((t) => t.type !== 'ERC20' && t.type !== 'native')) return false

  const transfers = event.transfers.filter((t) => t.from !== NULL_ADDRESS && t.to !== NULL_ADDRESS)

  const sent = new Set(
    transfers.filter((t) => t.from.toLowerCase() === event.fromAddress.toLowerCase()).map((t) => t.address),
  )
  const received = new Set(
    transfers.filter((t) => t.to.toLowerCase() === event.fromAddress.toLowerCase()).map((t) => t.address),
  )

  if (sent.size !== 1 || received.size !== 1 || sent.values() === received.values()) return false

  return true
}

export function formatNumber(numberString: string, precision?: number): string {
  const [integerPart, decimalPart] = numberString.split('.')
  const bigIntPart = BigInt(integerPart)

  if (integerPart.length < 3 && !decimalPart) return numberString

  // Format the integer part manually
  let formattedIntegerPart = ''
  const integerStr = bigIntPart.toString()
  for (let i = 0; i < integerStr.length; i++) {
    if (i > 0 && (integerStr.length - i) % 3 === 0) {
      formattedIntegerPart += ','
    }
    formattedIntegerPart += integerStr[i]
  }

  // Format the decimal part
  const formattedDecimalPart = decimalPart
    ? parseFloat('0.' + decimalPart)
        .toFixed(precision ?? 3)
        .split('.')[1]
    : '00'

  return formattedIntegerPart + '.' + formattedDecimalPart
}

export function displayAsset(asset: Payment | undefined): string {
  if (!asset || !asset.asset) return 'unknown asset'

  const amount = asset.amount === '0' ? '1' : asset.amount
  const symbol = asset.asset.type === 'ERC20' ? asset.asset.symbol : asset.asset.name

  if (symbol) return formatNumber(amount) + ' ' + symbol

  return formatNumber(amount) + ' ' + displayAddress(asset.asset.address)
}

export function getPayments({
  transfers,
  fromAddresses,
  toAddresses,
}: {
  transfers: Asset[]
  fromAddresses?: string[]
  toAddresses?: string[]
}): Payment[] {
  const fromAddressFilter = fromAddresses?.map((a) => a.toLowerCase())
  const toAddressFilter = toAddresses?.map((a) => a.toLowerCase())
  let filteredTransfers = transfers

  if (fromAddressFilter && fromAddressFilter.length > 0) {
    filteredTransfers = filteredTransfers.filter((t) => fromAddressFilter.includes(t.from.toLowerCase()))
  }

  if (toAddressFilter && toAddressFilter.length > 0) {
    filteredTransfers = filteredTransfers.filter((t) => toAddressFilter.includes(t.to.toLowerCase()))
  }

  return Object.values(
    filteredTransfers.reduce<Record<string, Payment>>((acc, t) => {
      const address = t.address
      const amount = Number(t.amount ?? '0')

      if (acc[address]) {
        acc[address].amount = (Number(acc[address].amount) + amount).toString()
      } else {
        acc[address] = {
          amount: amount.toString(),
          asset: {
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            type: t.type,
          },
        }
      }

      return acc
    }, {}),
  )
}

export function processNftTransfers(transfers: Asset[]) {
  const nftTransfers: Asset[] = []
  const sendingAddresses: Set<string> = new Set()
  const receivingAddresses: Set<string> = new Set()
  const erc20Transfers: Asset[] = []
  const nativeTransfers: Asset[] = []

  transfers.forEach((t) => {
    switch (t.type) {
      case 'ERC721':
      case 'ERC1155':
        nftTransfers.push(t)
        break
      case 'ERC20':
        erc20Transfers.push(t)
        break
      case 'native':
        nativeTransfers.push(t)
        break
    }
  })

  nftTransfers.forEach((t) => {
    if (t.from.toLowerCase() !== t.to.toLowerCase()) {
      receivingAddresses.add(t.to.toLowerCase())
      sendingAddresses.add(t.from.toLowerCase())
    }
  })

  const erc20Payments = getPayments({
    transfers: erc20Transfers,
    fromAddresses: Array.from(receivingAddresses),
  })

  const nativePayments = getPayments({
    transfers: nativeTransfers,
    fromAddresses: Array.from(receivingAddresses),
  })

  return {
    nftTransfers,
    erc20Payments,
    nativePayments,
    sendingAddresses: Array.from(sendingAddresses),
    receivingAddresses: Array.from(receivingAddresses),
  }
}

export function displayPayments(erc20Payments: Payment[], nativePayments: Payment[]) {
  if (erc20Payments.length > 0 && nativePayments.length > 0) {
    const amount = (erc20Payments.length + 1).toString()
    return amount + ' assets'
  } else if (erc20Payments.length > 0) {
    return (
      erc20Payments[0].amount +
      ' ' +
      (erc20Payments[0].asset?.symbol || erc20Payments[0].asset?.name + ' tokens' || 'ERCC20 tokens')
    )
  } else if (nativePayments.length > 0) {
    return (
      nativePayments[0].amount +
      ' ' +
      (nativePayments[0].asset?.symbol || nativePayments[0].asset?.name + ' tokens' || 'native tokens')
    )
  } else {
    return ''
  }
}

export function defaultEvent(event: DecodedTransaction): InterpretedTransaction {
  const burned = assetsReceived(event.transfers, NULL_ADDRESS)
  const minted = assetsSent(event.transfers, NULL_ADDRESS)

  const newEvent = {
    type: 'unknown' as const,
    action: 'Called method ' + event.methodCall.name,
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: event.methodCall.name,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
    assetsBurned: burned.length > 0 ? burned : undefined,
    assetsMinted: minted.length > 0 ? minted : undefined,
  }

  return newEvent
}

export function categorizedDefaultEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)
  // single burn
  if (newEvent.assetsBurned?.length === 1) {
    return {
      ...newEvent,
      type: 'burn',
      action: 'Burned ' + displayAsset(newEvent.assetsBurned[0]),
    }
  }

  // single mint
  if (newEvent.assetsMinted?.length === 1) {
    return {
      ...newEvent,
      type: 'mint',
      action: 'Mint of ' + displayAsset(newEvent.assetsMinted[0]),
    }
  }

  // single transfer
  if (filterZeroTransfers(event.transfers).length === 1) {
    const fromAddress =
      event.transfers[0].from.toLowerCase() === event.fromAddress.toLowerCase() ||
      event.transfers[0].to.toLowerCase() === event.fromAddress.toLowerCase()
        ? event.fromAddress
        : event.transfers[0].from
    const asset = toAssetTransfer(event.transfers[0])
    return {
      ...newEvent,
      type: 'transfer-token',
      action: 'Sent ' + displayAsset(asset),
      assetsSent: assetsSent(event.transfers, fromAddress),
      assetsReceived: assetsReceived(event.transfers, fromAddress),
    }
  }

  return newEvent
}
