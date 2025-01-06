import { Effect } from 'effect'
import { Hex, Address, encodeFunctionData } from 'viem'
import { AbiParams, AbiStore, ContractAbiResult, getAndCacheAbi, MissingABIError } from '../abi-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { TreeNode } from '../types.js'
import { PublicClient, RPCFetchError, UnknownNetwork } from '../public-client.js'
import { SAFE_MULTISEND_ABI, SAFE_MULTISEND_SIGNATURE } from './constants.js'

const callDataKeys = ['callData', 'data', '_data']
const addressKeys = ['to', 'target', '_target']

const decodeBytesRecursively = (
  node: TreeNode,
  chainID: number,
  address?: Address,
): Effect.Effect<
  TreeNode,
  AbiDecoder.DecodeError | MissingABIError | RPCFetchError | UnknownNetwork,
  AbiStore<AbiParams, ContractAbiResult> | PublicClient
> =>
  Effect.gen(function* () {
    const isCallDataNode =
      callDataKeys.includes(node.name) && node.type === 'bytes' && node.value && node.value !== '0x'

    if (
      node.components &&
      node.components.some((c) => callDataKeys.includes(c.name)) &&
      node.components.some((c) => addressKeys.includes(c.name))
    ) {
      const toAddress = node.components.find((c) => addressKeys.includes(c.name))?.value as Address | undefined
      return {
        ...node,
        components: yield* Effect.all(
          node.components.map((n) => decodeBytesRecursively(n, chainID, toAddress)),
          {
            concurrency: 'unbounded',
          },
        ),
      }
    }

    if (node.components) {
      return {
        ...node,
        components: yield* Effect.all(
          node.components.map((n) => decodeBytesRecursively(n, chainID, address)),
          {
            concurrency: 'unbounded',
          },
        ),
      }
    }

    if (isCallDataNode && address) {
      const decoded = yield* decodeMethod({
        data: node.value as Hex,
        chainID,
        contractAddress: address,
      }).pipe(Effect.orElseSucceed(() => null))

      return decoded
        ? {
            ...node,
            valueDecoded: decoded,
          }
        : node
    }

    return node
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
    const txs: string[][] = []
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
      txs.push([operation, to, value.toString(), dataLength.toString(), data])
    }

    //encode and decode the transactions for the proper data structure
    const txsEncoded = yield* Effect.try({
      try: () =>
        encodeFunctionData({
          abi: SAFE_MULTISEND_ABI,
          args: [txs],
        }),
      catch: (error) => new AbiDecoder.DecodeError(`Could not encode multisend transactions`, error),
    })
    const txsDecoded = yield* AbiDecoder.decodeMethod(txsEncoded, SAFE_MULTISEND_ABI)

    if (!txsDecoded || !txsDecoded.params) {
      return inputParams
    }

    //decode recursively all the bytes params
    const decodedParams = yield* Effect.all(
      txsDecoded.params.map((p) => decodeBytesRecursively(p, chainID, undefined)),
      {
        concurrency: 'unbounded',
      },
    )

    return inputParams.map((p) =>
      p.name === 'transactions'
        ? {
            ...p,
            valueDecoded: {
              ...txsDecoded,
              params: decodedParams,
            },
          }
        : p,
    )
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

    const abi = yield* getAndCacheAbi({
      address: contractAddress,
      signature,
      chainID,
    })

    const decoded = yield* AbiDecoder.decodeMethod(data, abi)

    if (decoded == null) {
      return yield* new AbiDecoder.DecodeError(`Failed to decode method: ${data}`)
    }

    //MULTISEND: decode the params for the multisend contract which is also related to the safe smart account
    if (
      decoded.signature === SAFE_MULTISEND_SIGNATURE &&
      decoded.params != null &&
      decoded.params.find((p) => p.name === 'transactions')
    ) {
      const decodedParams = yield* decodeGnosisMultisendParams(decoded.params, chainID)
      return {
        ...decoded,
        params: decodedParams,
      }
    }

    //Attempt to decode the params recursively if they contain data bytes or tuple params
    if (decoded.params != null) {
      const hasCalldataParam = decoded.params.find((p) => callDataKeys.includes(p.name) && p.type === 'bytes')
      const hasTuppleParams = decoded.params.some((p) => p.type === 'tuple')

      if (hasCalldataParam || hasTuppleParams) {
        const targetAddressParam = decoded.params.find((p) => addressKeys.includes(p.name))
        const targetAddress = targetAddressParam?.value as Address | undefined

        const decodedParams = yield* Effect.all(
          decoded.params.map((p) => decodeBytesRecursively(p, chainID, targetAddress)),
          {
            concurrency: 'unbounded',
          },
        )

        return {
          ...decoded,
          params: decodedParams,
        }
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
