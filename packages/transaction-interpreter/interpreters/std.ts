import type { AssetTransfer, InterpretedTransaction, InterpretedSwapTransaction } from '@/types.js'
import { Asset, DecodedTransaction } from '@3loop/transaction-decoder'

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

//------------------------------------------------------------------------------
//Core helper functions

interface FilterOptions {
  excludeZero?: boolean
  excludeNull?: boolean
  excludeDuplicates?: boolean
  sumUpRepeated?: boolean
}

type Payment = Omit<AssetTransfer, 'to' | 'from'>

export const filterTransfers = (transfers: Asset[], filters: FilterOptions = {}): Asset[] => {
  let filtered = [...transfers]

  if (filters.excludeZero) {
    filtered = filtered.filter((t) => (t.amount && t.amount !== '0') || !t.amount)
  }

  if (filters.excludeNull) {
    filtered = filtered.filter((t) => t.from !== NULL_ADDRESS && t.to !== NULL_ADDRESS)
  }

  if (filters.excludeDuplicates) {
    filtered = filtered.filter(
      (t, i, self) => self.findIndex((t2) => t2.address === t.address && t2.amount === t.amount) === i,
    )
  }

  if (filters.sumUpRepeated) {
    const transferMap = new Map<string, Asset>()

    filtered.forEach((transfer) => {
      const key = transfer.from.toLowerCase() + '-' + transfer.to.toLowerCase() + '-' + transfer.address.toLowerCase()

      if (transferMap.has(key)) {
        const existing = transferMap.get(key) || { ...transfer }
        const existingAmount = existing.amount ? Number(existing.amount) : 0
        const newAmount = transfer.amount ? Number(transfer.amount) : 0
        existing.amount = (existingAmount + newAmount).toString()
      } else {
        transferMap.set(key, { ...transfer })
      }
    })

    filtered = Array.from(transferMap.values())
  }

  return filtered
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

export function assetsSent(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  const filtered = filterTransfers(transfers, {
    excludeZero: true,
    excludeNull: fromAddress !== NULL_ADDRESS,
  })

  return filtered.filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase()).map(toAssetTransfer)
}

export function assetsReceived(transfers: Asset[], toAddress: string): AssetTransfer[] {
  const filtered = filterTransfers(transfers, {
    excludeZero: true,
  })

  return filtered.filter((t) => t.to.toLowerCase() === toAddress.toLowerCase()).map(toAssetTransfer)
}

function assetsMinted(transfers: Asset[], toAddress: string): AssetTransfer[] {
  const filtered = filterTransfers(transfers, {
    excludeZero: true,
  })

  return filtered
    .filter((t) => t.from.toLowerCase() === NULL_ADDRESS)
    .filter((t) => t.to.toLowerCase() === toAddress.toLowerCase())
    .map(toAssetTransfer)
}

function assetsBurned(transfers: Asset[], fromAddress: string): AssetTransfer[] {
  const filtered = filterTransfers(transfers, {
    excludeZero: true,
  })

  return filtered
    .filter((t) => t.to.toLowerCase() === NULL_ADDRESS)
    .filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase())
    .map(toAssetTransfer)
}

export function getNetTransfers({
  transfers,
  fromAddresses,
  toAddresses,
  type,
}: {
  transfers: Asset[]
  fromAddresses?: string[]
  toAddresses?: string[]
  type?: string | string[]
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

  if (type) {
    if (Array.isArray(type)) {
      filteredTransfers = filteredTransfers.filter((t) => type.includes(t.type))
    } else {
      filteredTransfers = filteredTransfers.filter((t) => t.type === type)
    }
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

  const erc20Payments = getNetTransfers({
    transfers: erc20Transfers,
    fromAddresses: Array.from(receivingAddresses),
  })

  const nativePayments = getNetTransfers({
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

//------------------------------------------------------------------------------
// Formatting Functions

export function displayAddress(address: string): string {
  return address.slice(0, 6) + '...' + address.slice(-4)
}

export const formatNumber = (numberString: string, precision = 3): string => {
  // Convert scientific notation to regular number
  const num = Number(numberString)

  if (isNaN(num)) return numberString

  // For very small numbers (less than 0.000001), return in scientific notation
  if (num < 0.000001 && num > 0) {
    return num.toExponential(precision)
  }

  const [integerPart, decimalPart] = num.toString().split('.')

  if ((integerPart && integerPart.length < 3 && !decimalPart) || (decimalPart && decimalPart.startsWith('000')))
    return numberString

  // Format the integer part manually
  let formattedIntegerPart = ''
  for (let i = 0; i < integerPart.length; i++) {
    if (i > 0 && (integerPart.length - i) % 3 === 0) {
      formattedIntegerPart += ','
    }
    formattedIntegerPart += integerPart[i]
  }

  // Format the decimal part
  const formattedDecimalPart = decimalPart
    ? parseFloat('0.' + decimalPart)
        .toFixed(precision)
        .split('.')[1]
    : '00'

  return formattedIntegerPart + '.' + formattedDecimalPart
}

export const displayAsset = (asset?: Payment): string => {
  if (!asset?.asset) return 'unknown asset'

  const symbol = asset.asset.type === 'ERC20' ? asset.asset.symbol : asset.asset.name

  if (symbol) return formatNumber(asset.amount) + ' ' + symbol

  return formatNumber(asset.amount) + ' ' + displayAddress(asset.asset.address)
}

export function displayAssets(assets: Payment[]) {
  const erc20 = assets.filter((a) => a.asset.type === 'ERC20')
  const native = assets.filter((a) => a.asset.type === 'native')

  if (assets.length === 1) {
    return displayAsset(assets[0])
  } else if (erc20.length > 0 && native.length > 0) {
    return (erc20.length + 1).toString() + ' assets'
  } else if (erc20.length > 0) {
    return erc20[0].amount + ' ' + (erc20[0].asset?.symbol || erc20[0].asset?.name + ' tokens' || 'ERCC20 tokens')
  } else if (native.length > 0) {
    return native[0].amount + ' ' + (native[0].asset?.symbol || native[0].asset?.name + ' tokens' || 'native tokens')
  } else {
    return ''
  }
}

//------------------------------------------------------------------------------
// Categorization Functions

export function isSwap(event: DecodedTransaction): boolean {
  if (event.transfers.some((t) => t.type !== 'ERC20' && t.type !== 'native')) return false

  const minted = assetsMinted(event.transfers, event.fromAddress)
  const burned = assetsBurned(event.transfers, event.fromAddress)

  if (minted.length > 0 || burned.length > 0) return false

  const transfers = filterTransfers(event.transfers, {
    excludeZero: true,
    excludeNull: true,
  })

  const uniqueSent = new Set(
    transfers.filter((t) => t.from.toLowerCase() === event.fromAddress.toLowerCase()).map((t) => t.address),
  )
  const uniqueReceived = new Set(
    transfers.filter((t) => t.to.toLowerCase() === event.fromAddress.toLowerCase()).map((t) => t.address),
  )

  if (uniqueSent.size !== 1 || uniqueReceived.size !== 1 || uniqueSent.values() === uniqueReceived.values())
    return false

  return true
}

export function defaultEvent(event: DecodedTransaction): InterpretedTransaction {
  const burned = assetsBurned(event.transfers, event.fromAddress)
  const minted = assetsMinted(event.transfers, event.fromAddress)

  const newEvent = {
    type: 'unknown' as const,
    action: "Called method '" + event.methodCall.name + "'",
    chain: event.chainID,
    txHash: event.txHash,
    timestamp: event.timestamp,
    user: { address: event.fromAddress, name: null },
    method: event.methodCall.name,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
    assetsBurned: burned.length > 0 ? burned : undefined,
    assetsMinted: minted.length > 0 ? minted : undefined,
  }

  return newEvent
}

// ------------------------------------------------------------------------------
// Generic Interpreters

export function genericSwapInterpreter(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)

  const netSent = getNetTransfers({
    transfers: event.transfers,
    fromAddresses: [event.fromAddress],
  })

  const netReceived = getNetTransfers({
    transfers: event.transfers,
    toAddresses: [event.fromAddress],
  })

  if (isSwap(event)) {
    const swapEvent: InterpretedSwapTransaction = {
      ...newEvent,
      type: 'swap',
      action: 'Swapped ' + displayAsset(netSent[0]) + ' for ' + displayAsset(netReceived[0]),
      context: {
        sent: [netSent[0]],
        received: [netReceived[0]],
      },
    }

    return swapEvent
  }

  return newEvent
}

export function genericInterpreter(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)
  const transfers = filterTransfers(event.transfers, {
    excludeDuplicates: true,
  })
  const nonZeroTransfers = filterTransfers(transfers, {
    excludeZero: true,
  })
  const minted = newEvent.assetsMinted || []
  const burned = newEvent.assetsBurned || []

  // single burn
  if (burned.length === 1 && nonZeroTransfers.length <= 2) {
    return {
      ...newEvent,
      type: 'burn',
      action: 'Burned ' + displayAsset(burned[0]),
    }
  }

  // single mint
  if (minted.length === 1 && newEvent.assetsSent.length <= 1) {
    const price = newEvent.assetsSent.length === 1 ? newEvent.assetsSent[0] : undefined
    return {
      ...newEvent,
      type: 'mint',
      action: 'Minted ' + displayAsset(minted[0]) + (price ? ' for ' + displayAsset(price) : ''),
    }
  }

  //batch mint
  if (minted.length > 1) {
    const price = newEvent.assetsSent.length === 1 ? newEvent.assetsSent[0] : undefined
    const uniqueAssets = new Set(minted.map((asset) => asset.asset.address))

    if (uniqueAssets.size === 1) {
      const amount = minted.reduce((acc, asset) => acc + Number(asset.amount), 0)
      return {
        ...newEvent,
        type: 'mint',
        action:
          'Minted ' +
          displayAsset({
            ...minted[0],
            amount: amount.toString(),
          }) +
          (price ? ' for ' + displayAsset(price) : ''),
      }
    }
  }

  // single transfer
  if (nonZeroTransfers.length === 1 && minted.length === 0 && burned.length === 0) {
    const fromAddress =
      nonZeroTransfers[0].from.toLowerCase() === event.fromAddress.toLowerCase() ||
      nonZeroTransfers[0].to.toLowerCase() === event.fromAddress.toLowerCase()
        ? event.fromAddress
        : nonZeroTransfers[0].from

    const asset = toAssetTransfer(nonZeroTransfers[0])

    return {
      ...newEvent,
      type: 'transfer-token',
      action: 'Sent ' + displayAsset(asset),
      assetsSent: assetsSent(event.transfers, fromAddress),
      assetsReceived: assetsReceived(event.transfers, fromAddress),
    }
  }

  //Generic Swap Interpreter
  if (isSwap(event)) {
    return genericSwapInterpreter(event)
  }

  return newEvent
}
