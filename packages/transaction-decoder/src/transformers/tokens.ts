import { formatEther, formatUnits } from 'viem'
import { Asset, AssetType, EventParams, Interaction } from '../types.js'
import { sameAddress } from '../helpers/address.js'

const toKeys = ['to', '_to', 'dst']
const fromKeys = ['from', '_from', 'src']
const valueKeys = ['value', 'amount', 'wad', '_amount']
export const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const transferEvents = ['Transfer', 'TransferBatch', 'TransferSingle']

function findValue(params: EventParams): EventParams[keyof EventParams] {
  // Find first value that is not null
  const match = valueKeys.find((key) => params[key] != null)
  if (match != null) {
    return params[match]
  } else {
    return ''
  }
}

function getTokenType(interaction: Interaction): AssetType {
  let tokenType = AssetType.DEFAULT

  if (interaction.contractType === 'ERC1155') {
    tokenType = AssetType.ERC1155
    // ERC-721
  } else if (interaction.contractType === 'ERC721') {
    tokenType = AssetType.ERC721
    // ERC-20
  } else if (interaction.contractType === 'ERC20' || interaction.contractType === 'WETH') {
    tokenType = AssetType.ERC20
  }

  return tokenType
}

function getTokens(interactions: Interaction[]): Asset[] {
  const filteredInteractions = interactions.filter((d) => transferEvents.includes(d.event.eventName || ''))

  return filteredInteractions
    .map((interaction) => {
      // NOTE: Already filtered by eventName, but we do not have yet configured
      // a more robust typing for events for TS to auotmatically handle it
      if ('nativeTransfer' in interaction.event) return []

      const event = interaction.event
      const tokenType = getTokenType(interaction)

      const value = findValue(event.params)
      const fromKey = fromKeys.find((key) => key in event.params && event.params[key] != null)
      const toKey = toKeys.find((key) => key in event.params && event.params[key] != null)
      const tokenId = (event.params.id ?? event.params.tokenId)?.toString()

      if (!fromKey || !toKey) {
        console.error('Invalid event:', event)
        return []
      }

      const to = event.params[toKey] as string
      const from = event.params[fromKey] as string

      if (tokenType === AssetType.ERC20) {
        const decimals = interaction.decimals ?? 18
        const amountNumber = formatUnits(BigInt(value as string), decimals)

        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            amount: amountNumber,
            to,
            from,
          },
        ]
      } else if (tokenType === AssetType.ERC721) {
        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            amount: '1',
            tokenId,
            to,
            from,
          },
        ]
      } else if (tokenType === AssetType.ERC1155) {
        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            tokenId,
            amount: value as string,
            to,
            from,
          },
        ]
      }

      console.error('Unsupported type:', interaction)
      // TODO: Batch transfers are not supported yet
      return []
    })
    .flat()
}

function getNativeTokenValueEvents(interactions: Interaction[], from: string): Asset[] {
  return interactions.reduce((acc, interaction) => {
    if (
      'nativeTransfer' in interaction.event &&
      interaction.event.nativeTransfer &&
      // NOTE: We already have native transfer from receipt, thus we ignore the one from trace
      !sameAddress(interaction.event.params.from, from)
    ) {
      const eventParams = interaction.event.params
      return [
        ...acc,
        {
          from: eventParams.from,
          to: eventParams.to,
          type: AssetType.native,
          amount: getNativeTokenValueSent(eventParams.value),
          name: 'Ethereum', // TODO: Make chain agnostic
          symbol: 'ETH',
          address: ethAddress,
        },
      ]
    } else {
      return acc
    }
  }, [] as Asset[])
}

function getNativeTokenValueSent(nativeValueSent: string | undefined): string {
  return Number(formatEther(BigInt(nativeValueSent || 0)))
    .toString()
    .replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')
}

export function getAssetsTransfers(interactions: Interaction[], value: string, from: string, to: string): Asset[] {
  const assets = getTokens(interactions)
  const ethValueSent = getNativeTokenValueSent(value)
  const nativeTransfer = getNativeTokenValueEvents(interactions, from)

  if (Number(ethValueSent)) {
    assets.push({
      from,
      to,
      type: AssetType.native,
      amount: ethValueSent,
      name: 'Ethereum', // TODO: Make chain agnostic
      symbol: 'ETH',
      address: ethAddress,
    })
  }

  return [...assets, ...nativeTransfer]
}
