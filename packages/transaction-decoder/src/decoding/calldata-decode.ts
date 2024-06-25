import { Effect } from 'effect'
import { isAddress, Abi, Hex } from 'viem'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import * as AbiDecoder from './abi-decode.js'

export const decodeMethod = ({
  data,
  chainID,
  contractAddress,
}: {
  data: Hex
  chainID: number
  contractAddress: string
}) =>
  Effect.gen(function* () {
    const signature = data.slice(0, 10)

    if (isAddress(contractAddress)) {
      //if contract is a proxy, get the implementation address
      const implementation = yield* getProxyStorageSlot({ address: contractAddress, chainID })

      if (implementation) {
        contractAddress = implementation
      }
    }

    const abi_ = yield* getAndCacheAbi({
      address: contractAddress,
      signature,
      chainID,
    })

    if (!abi_) {
      return yield* new AbiDecoder.MissingABIError(contractAddress, signature, chainID)
    }

    const abi = JSON.parse(abi_) as Abi

    const decoded = yield* AbiDecoder.decodeMethod(data, abi)

    if (decoded == null) {
      return yield* new AbiDecoder.DecodeError(`Failed to decode method: ${data}`)
    }

    return decoded
  }).pipe(
    Effect.withSpan('CalldataDecode.decodeMethod', {
      attributes: {
        chainID,
        contractAddress,
      },
    }),
  )
