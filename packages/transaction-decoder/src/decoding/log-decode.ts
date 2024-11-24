import { type GetTransactionReturnType, type Log, decodeEventLog, getAbiItem, getAddress } from 'viem'
import { Effect } from 'effect'
import type { DecodedLogEvent, Interaction, RawDecodedLog } from '../types.js'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { getAndCacheContractMeta } from '../contract-meta-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { stringify } from '../helpers/stringify.js'
import { formatAbiItem } from 'viem/utils'

function formatValue(arg: any): any {
  if (arg == null) return null
  if (Array.isArray(arg)) return arg.map(formatValue)
  if (typeof arg === 'object') {
    return Object.fromEntries(Object.entries(arg).map(([key, value]) => [key.toString(), value?.toString()]))
  }
  return arg.toString()
}

const decodedLog = (transaction: GetTransactionReturnType, logItem: Log) =>
  Effect.gen(function* () {
    const chainID = Number(transaction.chainId)

    const address = logItem.address
    let abiAddress = address

    const implementation = yield* getProxyStorageSlot({ address: getAddress(abiAddress), chainID })

    if (implementation) {
      yield* Effect.logDebug(`Proxy implementation found for ${abiAddress} at ${implementation}`)
      abiAddress = implementation.address
    }

    const abiItem = yield* getAndCacheAbi({
      address: abiAddress,
      event: logItem.topics[0],
      chainID,
    })

    const { eventName, args: args_ } = yield* Effect.try({
      try: () =>
        decodeEventLog({
          abi: abiItem,
          topics: logItem.topics,
          data: logItem.data,
          strict: false,
        }),
      catch: (err) => new AbiDecoder.DecodeError(`Could not decode log ${abiAddress}`, err),
    })

    if (eventName == null) {
      return yield* new AbiDecoder.DecodeError(`Could not decode log ${abiAddress}`)
    }

    const args = args_ as any

    const fragment = yield* Effect.try({
      try: () => getAbiItem({ abi: abiItem, name: eventName }),
      catch: () => {
        Effect.logError(`Could not find fragment in ABI ${abiAddress} ${eventName}`)
      },
    })

    if (fragment == null) {
      return yield* new AbiDecoder.DecodeError(`Could not find fragment in ABI ${abiAddress} ${eventName}`)
    }

    const decodedParams = yield* Effect.try({
      try: () => {
        if ('inputs' in fragment && fragment.inputs != null) {
          return fragment.inputs.map((input, i) => {
            if (input.name == null) return null

            const arg = Array.isArray(args) ? args[i] : args[input.name]
            const value = formatValue(arg)

            return {
              type: input.type,
              name: input.name,
              value,
            } as DecodedLogEvent
          })
        }
        return []
      },
      catch: () => {
        Effect.logError(`Could not decode log params ${stringify(logItem)}`)
      },
    })

    const textSignature = formatAbiItem(fragment)

    const rawLog: RawDecodedLog = {
      events: decodedParams.filter((x) => x != null) as DecodedLogEvent[],
      name: eventName,
      address,
      logIndex: logItem.logIndex ?? -1,
      signature: textSignature,
      decoded: true,
    }

    return yield* transformLog(transaction, rawLog)
  })

const transformLog = (transaction: GetTransactionReturnType, log: RawDecodedLog) =>
  Effect.gen(function* () {
    const events = Object.fromEntries(log.events.map((param) => [param.name, param.value]))

    // NOTE: Can use a common parser with branded type evrywhere
    const address = getAddress(log.address)

    const contractData = yield* getAndCacheContractMeta({
      address,
      chainID: Number(transaction.chainId),
    })

    return {
      contractName: contractData?.contractName || null,
      contractSymbol: contractData?.tokenSymbol || null,
      contractAddress: address,
      decimals: contractData?.decimals || null,
      chainID: Number(transaction.chainId),
      contractType: contractData?.type ?? 'OTHER',
      signature: log.signature,
      event: {
        eventName: log.name,
        logIndex: log.logIndex,
        params: events,
        ...(!log.decoded && { decoded: log.decoded }),
      },
    } as Interaction
  })

export const decodeLogs = ({ logs, transaction }: { logs: readonly Log[]; transaction: GetTransactionReturnType }) =>
  Effect.gen(function* () {
    const effects = logs.filter((log) => log.topics.length > 0).map((logItem) => decodedLog(transaction, logItem))

    const eithers = effects.map((e) => Effect.either(e))

    const resp = yield* Effect.all(eithers, {
      concurrency: 'inherit',
      batching: 'inherit',
    })

    return resp
  })
