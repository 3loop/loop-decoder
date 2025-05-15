import { formatEther, formatUnits } from 'viem'
import { Asset, AssetType, EventParams, Interaction } from '../types.js'
import { sameAddress } from '../helpers/address.js'
import { Data, Effect, Either } from 'effect'

class TransferDecodeError extends Data.TaggedError('TransferDecodeError')<{ message: string }> {
  constructor(message: string) {
    super({ message })
  }
}

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

function decodeTransfer(interaction: Interaction): Effect.Effect<Asset, TransferDecodeError, never> {
  return Effect.gen(function* () {
    const event = interaction.event
    const tokenType = getTokenType(interaction)

    if ('nativeTransfer' in event) {
      return yield* new TransferDecodeError(`Native transfer at index ${event.logIndex}`)
    }

    const value = findValue(event.params)
    const fromKey = fromKeys.find((key) => key in event.params && event.params[key] != null)
    const toKey = toKeys.find((key) => key in event.params && event.params[key] != null)
    const tokenId = (event.params.id ?? event.params.tokenId)?.toString()

    if (!fromKey || !toKey) {
      yield* new TransferDecodeError(`Invalid event at index ${event.logIndex}`)
    }

    // Type guard: fromKey and toKey are defined here
    const to = event.params[toKey!] as string
    const from = event.params[fromKey!] as string

    if (tokenType === AssetType.ERC20) {
      const decimals = interaction.decimals ?? 18
      const amountNumber = formatUnits(BigInt(value as string), decimals)
      return {
        type: tokenType,
        name: interaction.contractName,
        symbol: interaction.contractSymbol,
        address: interaction.contractAddress,
        amount: amountNumber,
        to,
        from,
      }
    } else if (tokenType === AssetType.ERC721) {
      return {
        type: tokenType,
        name: interaction.contractName,
        symbol: interaction.contractSymbol,
        address: interaction.contractAddress,
        amount: '1',
        tokenId,
        to,
        from,
      }
    } else if (tokenType === AssetType.ERC1155) {
      return {
        type: tokenType,
        name: interaction.contractName,
        symbol: interaction.contractSymbol,
        address: interaction.contractAddress,
        tokenId,
        amount: value as string,
        to,
        from,
      }
    } else {
      // TODO: Batch transfers are not supported yet
      return yield* new TransferDecodeError(`Unsupported token type: ${tokenType}`)
    }
  })
}

function getTokenTransfers(interactions: Interaction[]) {
  return Effect.gen(function* () {
    const filteredInteractions = interactions
      .filter((d) => transferEvents.includes(d.event.eventName || ''))
      .filter((d) => !('nativeTransfer' in d.event))

    const effects = filteredInteractions.map(decodeTransfer)
    const eithers = effects.map((e) => Effect.either(e))

    const result = yield* Effect.all(eithers, {
      concurrency: 'inherit',
      batching: 'inherit',
    })

    return result
  })
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

export function getAssetTransfers(interactions: Interaction[], value: string, from: string, to: string) {
  return Effect.gen(function* () {
    const tokenTransfers = yield* getTokenTransfers(interactions)
    const tokenTransfersRight = tokenTransfers.filter(Either.isRight).map((r) => r.right)
    const tokenTransfersErrors = tokenTransfers.filter(Either.isLeft).map((r) => r.left)

    const ethValueSent = getNativeTokenValueSent(value)
    const nativeTransfer = getNativeTokenValueEvents(interactions, from)

    if (Number(ethValueSent)) {
      tokenTransfersRight.push({
        from,
        to,
        type: AssetType.native,
        amount: ethValueSent,
        name: 'Ethereum', // TODO: Make chain agnostic
        symbol: 'ETH',
        address: ethAddress,
      })
    }

    return { errors: tokenTransfersErrors, transfers: [...tokenTransfersRight, ...nativeTransfer] }
  })
}
