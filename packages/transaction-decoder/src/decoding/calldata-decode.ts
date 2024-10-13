import { Effect } from 'effect'
import { isAddress, Hex, getAddress } from 'viem'
import { getProxyStorageSlot } from './proxies.js'
import { AbiParams, AbiStore, ContractAbiResult, getAndCacheAbi, MissingABIError } from '../abi-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { DecodeResult, InputArg, ProxyType, TreeNode } from '../types.js'
import { PublicClient, RPCFetchError, UnknownNetwork } from '../public-client.js'
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
                const callData = param.components.find((p) => p.name === 'callData' || p.name === 'data')

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
                    if (p.name === 'callData' && decoded) {
                      return {
                        ...p,
                        value: callData.value,
                        valueDecoded: decoded,
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

//https://etherscan.io/address/0x40a2accbd92bca938b02010e17a5b8929b49130d
const decodeGnosisMultisendParams = (
  inputParams: TreeNode[],
  chainID: number,
): Effect.Effect<
  TreeNode[],
  AbiDecoder.DecodeError | MissingABIError | RPCFetchError | UnknownNetwork,
  AbiStore<AbiParams, ContractAbiResult> | PublicClient
> =>
  Effect.gen(function* () {
    if (inputParams.length === 0) {
      return inputParams
    }

    //Code from https://github.com/safe-global/safe-core-sdk/blob/dc98509f15f42f04d65edcbada3bcf1f61f1154a/packages/protocol-kit/src/utils/transactions/utils.ts#L159
    const txs = []
    // Decode after 0x
    let index = 2
    const transactionBytes = inputParams.find((p) => p.name === 'transactions')?.value as Hex
    while (index < transactionBytes.length) {
      // As we are decoding hex encoded bytes calldata, each byte is represented by 2 chars
      // uint8 operation, address to, value uint256, dataLength uint256
      const operation = `0x${transactionBytes.slice(index, (index += 2))}`
      const to = `0x${transactionBytes.slice(index, (index += 40))}`
      const value = `0x${transactionBytes.slice(index, (index += 64))}`
      const dataLength = parseInt(`${transactionBytes.slice(index, (index += 64))}`, 16) * 2
      const data = `0x${transactionBytes.slice(index, (index += dataLength))}`
      txs.push({
        operation: Number(operation),
        to: getAddress(to),
        value: BigInt(value).toString(),
        data,
      })
    }
    const txsDecoded = yield* Effect.all(
      txs.map((tx) => {
        return decodeMethod({
          data: tx.data as Hex,
          chainID,
          contractAddress: tx.to,
        }).pipe(Effect.orElseSucceed(() => null))
      }),
      {
        concurrency: 'unbounded',
      },
    )

    return inputParams.map((param) => {
      if (param.name === 'transactions') {
        return {
          ...param,
          valueDecoded: txsDecoded.filter((tx) => tx != null) as DecodeResult[],
        } as InputArg
      }
      return param
    })
  })

export const decodeGnosisSafeParams = (
  params: TreeNode[],
  chainID: number,
): Effect.Effect<
  TreeNode[],
  AbiDecoder.DecodeError | MissingABIError | RPCFetchError | UnknownNetwork,
  AbiStore<AbiParams, ContractAbiResult> | PublicClient
> =>
  Effect.gen(function* () {
    const toParam = params.find((p) => p.name === 'to')
    const dataParam = params.find((p) => p.name === 'data')
    const toAddress = toParam?.value as Hex
    const callData = dataParam?.value as Hex

    if (toParam && dataParam && toAddress && callData) {
      const decoded = yield* decodeMethod({
        data: callData,
        chainID,
        contractAddress: toAddress,
      })

      if (decoded && decoded.params) {
        return params.map((param) =>
          param.name === 'data' ? ({ ...param, valueDecoded: decoded } as InputArg) : param,
        )
      }
      return params
    }

    return params
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
    let proxyType: ProxyType | undefined

    if (isAddress(contractAddress)) {
      //if contract is a proxy, get the implementation address
      const implementation = yield* getProxyStorageSlot({ address: getAddress(contractAddress), chainID })

      if (implementation) {
        contractAddress = implementation.address
        proxyType = implementation.type
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

    if (proxyType && proxyType === 'gnosis' && decoded.params != null) {
      const decodedParams = yield* decodeGnosisSafeParams(decoded.params, chainID)
      return {
        ...decoded,
        params: decodedParams,
      }
    }

    if (
      decoded.signature === 'multiSend(bytes)' &&
      decoded.params != null &&
      decoded.params.find((p) => p.name === 'transactions')
    ) {
      const decodedParams = yield* decodeGnosisMultisendParams(decoded.params, chainID)
      return {
        ...decoded,
        params: decodedParams,
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
