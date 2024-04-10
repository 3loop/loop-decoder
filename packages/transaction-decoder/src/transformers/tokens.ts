import { Address, formatEther, formatUnits, isAddress } from 'viem'
import { Asset, AssetType, Interaction, InteractionEvent } from '../types.js'
import { sameAddress } from '../helpers/address.js'

const toKeys = ['to', '_to', 'dst']
const fromKeys = ['from', '_from', 'src']
export const ethAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const transferEvents = ['Transfer', 'TransferBatch', 'TransferSingle']

export function toOrFromUser(event: InteractionEvent, direction: 'to' | 'from', userAddress: string) {
  const directionArr = direction === 'to' ? toKeys : fromKeys
  return (
    directionArr.filter(
      (key: string) => isAddress(event.params[key] as string) && sameAddress(event.params[key] as Address, userAddress),
    ).length > 0
  )
}

function getTokenType(interaction: Interaction): AssetType {
  const LPTokenSymbols = ['UNI-V2']
  let tokenType = AssetType.DEFAULT

  // LP Token
  if (interaction.contractSymbol && LPTokenSymbols.includes(interaction.contractSymbol)) {
    tokenType = AssetType.LPToken
    // ERC-1155
  } else if (interaction.contractType === 'ERC1155') {
    tokenType = AssetType.ERC1155
    // ERC-721
  } else if (interaction.contractType === 'ERC721') {
    tokenType = AssetType.ERC721
    // ERC-20
  } else if (interaction.contractType === 'ERC20') {
    tokenType = AssetType.ERC20
  }

  return tokenType
}

// TODO: use a better number formatter
function getTokens(interactions: Interaction[], userAddress: string, direction: 'to' | 'from'): Asset[] {
  const filteredInteractions = interactions
    .filter((d) => transferEvents.includes(d.event.eventName || ''))
    .filter((d) => toOrFromUser(d.event, direction, userAddress))

  return filteredInteractions
    .map((interaction) => {
      const event = interaction.event
      const tokenType = getTokenType(interaction)

      // event.params.wad
      // event.params._amount
      if (tokenType === AssetType.ERC20) {
        const params = event.params as { to: string; from: string; amount?: string; value?: string }
        const decimals = interaction.decimals ?? 18
        const value = params.amount ?? params.value ?? ''
        const amountNumber = Number(formatUnits(BigInt(value), decimals))
        const amount = amountNumber?.toFixed(12).replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')

        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            amount,
            // to: params.to,
            // from: params.from,
          } as Asset,
        ]
      } else if (tokenType === AssetType.ERC721) {
        const params = event.params as { to: string; from: string; tokenId: string }

        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            tokenId: params.tokenId,
            // to: params.to,
            // from: params.from,
          } as Asset,
        ]
      } else if (event.eventName === 'TransferSingle') {
        const params = event.params as {
          to: string
          from: string
          id: string
          value: string
        }
        const amount = Number(params.value)
          ?.toFixed(12)
          .replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')

        return [
          {
            type: tokenType,
            name: interaction.contractName,
            symbol: interaction.contractSymbol,
            address: interaction.contractAddress,
            tokenId: params.id,
            amount,
            // to: params.to,
            // from: params.from,
          } as Asset,
        ]
      } else {
        return []
      }
    })
    .flat()
}

// -------------------------------- NATIVE ------------------------------------

function getNativeTokenValueEvents(interactions: Interaction[]): InteractionEvent[] {
  return interactions.reduce<InteractionEvent[]>((acc, interaction) => {
    const nativeTokenEvent = interaction.event.nativeTransfer
    if (nativeTokenEvent) {
      return [...acc, interaction.event]
    } else {
      return acc
    }
  }, [])
}

function getNativeTokenValueReceived(interactions: Interaction[], userAddress: string): string {
  const nativeTokenEvents = getNativeTokenValueEvents(interactions)
  const nativeTokenEventsReceived = nativeTokenEvents.filter((event) => sameAddress(event.params.to, userAddress))
  const val = nativeTokenEventsReceived.reduce(
    (acc, event) => acc + Number(formatEther(BigInt(event.params.value as string) ?? 0)),
    0,
  )

  return val.toFixed(20).replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')
}

function getNativeTokenValueSent(
  interactions: Interaction[],
  nativeValueSent: string | undefined,
  fromAddress: string,
  userAddress: string,
): string {
  if (sameAddress(fromAddress, userAddress))
    return Number(formatEther(BigInt(nativeValueSent || 0)))
      .toString()
      .replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')

  const nativeTokenEvents = getNativeTokenValueEvents(interactions)
  const nativeTokenEventsReceived = nativeTokenEvents.filter((event) => sameAddress(event.params.from, userAddress))
  const val = nativeTokenEventsReceived.reduce(
    (acc, event) => acc + Number(formatEther(BigInt((event.params.value as string | undefined) || 0))),
    0,
  )
  return val.toFixed(20).replace(/^(\d+\.\d*?[0-9])0+$/g, '$1')
}

// --------------------------------- WETH -------------------------------------

function getWethInteraction(interactions: Interaction[], direction: string, userAddress: string): Asset | null {
  const eventDirection = direction === 'received' ? 'Deposit' : 'Withdraw'
  const wethInteractions = interactions.filter(
    (interaction) =>
      interaction.contractType === 'WETH' &&
      interaction.event.eventName === eventDirection &&
      sameAddress(interaction.event.params.dst, userAddress),
  )
  if (wethInteractions.length > 0) {
    const val = wethInteractions.reduce(
      (acc, interaction) =>
        acc + Number(formatEther(BigInt((interaction.event.params.wad as string | undefined) || 0))),
      0,
    )
    return {
      type: AssetType.ERC20,
      amount: val.toFixed(20).replace(/^(\d+\.\d*?[0-9])0+$/g, '$1'),
      name: wethInteractions[0].contractName,
      symbol: wethInteractions[0].contractSymbol,
      address: wethInteractions[0].contractAddress,
    }
  } else {
    return null
  }
}

export function getAssetsReceived(interactions: Interaction[], userAddress: string): Asset[] {
  const assets = getTokens(interactions, userAddress, 'to')
  const nativeValueReceived = getNativeTokenValueReceived(interactions, userAddress)
  const wethInteraction = getWethInteraction(interactions, 'received', userAddress)

  if (Number(nativeValueReceived)) {
    assets.push({
      type: AssetType.native,
      amount: nativeValueReceived,
      name: 'Ethereum',
      symbol: 'ETH',
      address: ethAddress,
    })
  }

  if (wethInteraction != null) {
    assets.push(wethInteraction)
  }

  return assets
}

export function getAssetsSent(
  interactions: Interaction[],
  nativeValueSent: string | undefined,
  userAddress: string,
  fromAddress: string,
): Asset[] {
  const assets = getTokens(interactions, userAddress, 'from')

  const ethValueSent = getNativeTokenValueSent(interactions, nativeValueSent, fromAddress, userAddress)

  if (Number(ethValueSent)) {
    assets.push({
      type: AssetType.native,
      amount: ethValueSent,
      name: 'Ethereum',
      symbol: 'ETH',
      address: ethAddress,
    })
  }

  const wethInteraction = getWethInteraction(interactions, 'sent', userAddress)

  if (wethInteraction != null) {
    assets.push(wethInteraction)
  }

  return assets
}
