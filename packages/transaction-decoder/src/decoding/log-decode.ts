import { type GetTransactionReturnType, type Log, decodeEventLog, getAbiItem, getAddress } from 'viem'
import { Effect } from 'effect'
import type { DecodedLogEvent, Interaction, RawDecodedLog } from '../types.js'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { getAndCacheContractMeta } from '../contract-meta-loader.js'
import * as AbiDecoder from './abi-decode.js'
import { stringify } from '../helpers/stringify.js'
import { formatAbiItem } from 'viem/utils'

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
      catch: (err) =>
        Effect.gen(function* () {
          yield* Effect.logError(`Could not decode log ${abiAddress} `, err)
          return new AbiDecoder.DecodeError(`Could not decode log ${abiAddress}`)
        }),
    })

    if (eventName == null) {
      return yield* new AbiDecoder.DecodeError(`Could not decode log ${abiAddress}`)
    }

    const args = args_ as any

    const fragment = getAbiItem({ abi: abiItem, name: eventName })

    if (fragment == null) {
      return yield* new AbiDecoder.DecodeError(`Could not find fragment in ABI ${abiAddress} ${eventName}`)
    }

    const decodedParams = yield* Effect.try({
      try: () => {
        if ('inputs' in fragment && fragment.inputs != null) {
          return fragment.inputs.map((input, i) => {
            if (input.name == null) return null

            const arg = Array.isArray(args) ? args[i] : args[input.name]

            let value
            if (arg == null) {
              value = null
            } else if (Array.isArray(arg)) {
              value = arg.map((item) => item?.toString())
            } else {
              value = arg.toString()
            }

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

    return yield* Effect.all(eithers, {
      concurrency: 'inherit',
      batching: 'inherit',
    })
  })
