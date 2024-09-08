import { Effect } from 'effect'
import { isAddress, Hex } from 'viem'
import { getProxyStorageSlot } from './proxies.js'
import { AbiParams, AbiStore, ContractAbiResult, getAndCacheAbi, MissingABIError } from '../abi-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { TreeNode } from '@/types.js'
import { PublicClient, RPCFetchError, UnknownNetwork } from '@/public-client.js'
import { sameAddress } from '../helpers/address.js'

// Same address on all supported chains https://www.multicall3.com/deployments
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

const decodeMulticall3 = (
  params: TreeNode[],
  chainID: number,
): Effect.Effect<
  TreeNode[],
  AbiDecoder.DecodeError | MissingABIError | RPCFetchError | UnknownNetwork,
  AbiStore<AbiParams, ContractAbiResult> | PublicClient
> =>
  Effect.gen(function* () {
    const decodeCalls = params.map((par) =>
      Effect.gen(function* () {
        if (par.components != null) {
          // NOTE: Iterate over tuples
          const next = yield* Effect.all(
            par.components.map((param) =>
              Effect.gen(function* () {
                if (param.components == null) return param
                const target = param.components.find((p) => p.name === 'target')
                const callData = param.components.find((p) => p.name === 'callData')

                // NOTE: Found a tuple with calldata, recursively decode the calldata
                if (target != null && callData != null && callData.value != null) {
                  const targetAddress = target.value as Hex

                  // NOTE: For nested failed calls we ignore the error as there could be contract that are not verified
                  const decoded = yield* decodeMethod({
                    data: callData.value as Hex,
                    chainID,
                    contractAddress: targetAddress,
                  }).pipe(Effect.orElseSucceed(() => null))

                  // Replace the call data with the decoded call data tree
                  const components = param.components.map((p) => {
                    if (p.name === 'callData') {
                      return {
                        ...p,
                        value: decoded,
                        decoded: !!decoded,
                      }
                    }
                    return p
                  })

                  return {
                    ...param,
                    components,
                  } as TreeNode
                }

                return param
              }),
            ),
            {
              concurrency: 'unbounded',
            },
          )

          return {
            ...par,
            components: next,
          }
        } else {
          return par
        }
      }),
    )

    return yield* Effect.all(decodeCalls, {
      concurrency: 'unbounded',
    })
  })

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

    const abi = yield* getAndCacheAbi({
      address: contractAddress,
      signature,
      chainID,
    })

    const decoded = yield* AbiDecoder.decodeMethod(data, abi)

    if (decoded == null) {
      return yield* new AbiDecoder.DecodeError(`Failed to decode method: ${data}`)
    }

    if (sameAddress(MULTICALL3_ADDRESS, contractAddress) && decoded.params != null) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const deepDecodedParams = yield* decodeMulticall3(decoded.params!, chainID)
      return {
        ...decoded,
        params: deepDecodedParams,
      }
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
