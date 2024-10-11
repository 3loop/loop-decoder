import { Effect } from 'effect'
import { isAddress, Hex, getAddress, encodeFunctionData, Address } from 'viem'
import { getProxyStorageSlot } from './proxies.js'
import { AbiParams, AbiStore, ContractAbiResult, getAndCacheAbi, MissingABIError } from '../abi-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { ProxyType, TreeNode } from '../types.js'
import { PublicClient, RPCFetchError, UnknownNetwork } from '../public-client.js'
import { sameAddress } from '../helpers/address.js'
import { MULTICALL3_ADDRESS, SAFE_MULTISEND_ABI, SAFE_MULTISEND_SIGNATURE } from './constants.js'

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
    const callDataKeys = ['callData', 'data']
    const addressKeys = ['to', 'target']

    if (
      node.components &&
      node.components.some((c) => callDataKeys.includes(c.name)) &&
      node.components.some((c) => addressKeys.includes(c.name))
    ) {
      const toAddress = node.components.find((c) => addressKeys.includes(c.name))?.value as Address
      return {
        ...node,
        components: yield* Effect.all(
          node.components.map((n) => decodeBytesRecursively(n, chainID, toAddress)),
          {
            concurrency: 'unbounded',
          },
        ),
      } as TreeNode
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
      } as TreeNode
    }

    if (callDataKeys.includes(node.name) && node.type === 'bytes' && node.value && node.value !== '0x') {
      if (address) {
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
      } else {
        const decoded = yield* decodeMethod({
          data: node.value as Hex,
          chainID,
          contractAddress: '',
        }).pipe(Effect.orElseSucceed(() => null))

        return decoded
          ? {
              ...node,
              valueDecoded: decoded,
            }
          : node
      }
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
      catch: (error) => new AbiDecoder.DecodeError(error),
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
        ? ({
            ...p,
            valueDecoded: {
              ...txsDecoded,
              params: decodedParams,
            },
          } as TreeNode)
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
      const targetAddress = decoded.params.find((p) => p.name === 'target')?.value
      const decodedParams = yield* Effect.all(
        decoded.params.map((p) =>
          decodeBytesRecursively(p, chainID, targetAddress ? (targetAddress as Address) : undefined),
        ),
        {
          concurrency: 'unbounded',
        },
      )

      return {
        ...decoded,
        params: decodedParams,
      }
    }

    //decode the params for the safe smart account contract
    if (proxyType && proxyType === 'safe' && decoded.params != null) {
      const toAddress = decoded.params.find((p) => p.name === 'to')?.value
      const decodedParams = yield* Effect.all(
        decoded.params.map((p) => decodeBytesRecursively(p, chainID, toAddress ? (toAddress as Address) : undefined)),
        {
          concurrency: 'unbounded',
        },
      )

      return {
        ...decoded,
        params: decodedParams,
      }
    }

    //decode the params for the multisend contract which is also related to the safe smart account
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

    return decoded
  }).pipe(
    Effect.withSpan('CalldataDecode.decodeMethod', {
      attributes: {
        chainID,
        contractAddress,
      },
    }),
  )
