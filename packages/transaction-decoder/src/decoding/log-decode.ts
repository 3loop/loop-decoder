import { type GetTransactionReturnType, type Log, decodeEventLog, getAbiItem, type Abi } from 'viem'
import { Effect } from 'effect'
import type { DecodedLogEvent, Interaction, RawDecodedLog } from '../types.js'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { getAndCacheContractMeta } from '../contract-meta-loader.js'
import * as AbiDecoder from './abi-decode.js'

const decodedLog = (transaction: GetTransactionReturnType, logItem: Log) =>
    Effect.gen(function* (_) {
        const chainID = Number(transaction.chainId)

        const address = logItem.address
        let abiAddress = address

        //NOTE: if contract is a proxy, get the implementation address
        const implementation = yield* _(getProxyStorageSlot({ address: abiAddress, chainID }))

        if (implementation) {
            abiAddress = implementation
        }

        const abiItem_ = yield* _(
            getAndCacheAbi({
                address: abiAddress,
                event: logItem.topics[0],
                chainID,
            }),
        )

        if (abiItem_ == null) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return yield* _(Effect.fail(new AbiDecoder.MissingABIError(abiAddress, logItem.topics[0]!, chainID)))
        }

        const abiItem = JSON.parse(abiItem_) as Abi[]

        const { eventName, args: args_ } = yield* _(
            Effect.try(() =>
                decodeEventLog({
                    abi: abiItem,
                    topics: logItem.topics,
                    data: logItem.data,
                }),
            ),
        )

        if (args_ == null || eventName == null) {
            return yield* _(Effect.fail(new AbiDecoder.DecodeError(`Could not decode log ${abiAddress}`)))
        }

        const args = args_ as unknown as { [key: string]: any }

        const fragment = getAbiItem({ abi: abiItem, name: eventName })

        if (fragment == null) {
            return yield* _(Effect.fail(new AbiDecoder.DecodeError('Could not decode log')))
        }

        const decodedParams = yield* _(
            Effect.try({
                try: () => {
                    if ('inputs' in fragment && fragment.inputs != null) {
                        return fragment.inputs.map((input) => {
                            if (input.name == null) return null

                            const arg = args[input.name]
                            const value = Array.isArray(arg) ? arg.map((item) => item?.toString()) : arg.toString()

                            return {
                                type: input.type,
                                name: input.name,
                                value,
                            } as DecodedLogEvent
                        })
                    }
                    return []
                },
                catch: () => [],
            }),
        )

        const rawLog: RawDecodedLog = {
            events: decodedParams.filter((x) => x != null) as DecodedLogEvent[],
            name: eventName,
            address,
            logIndex: logItem.logIndex ?? -1,
            decoded: true,
        }

        return yield* _(transformLog(transaction, rawLog))
    })

const transformLog = (transaction: GetTransactionReturnType, log: RawDecodedLog) =>
    Effect.gen(function* (_) {
        const events = Object.fromEntries(log.events.map((param) => [param.name, param.value]))

        // NOTE: Can use a common parser with branded type evrywhere
        const address = log.address.toLowerCase()

        const contractData = yield* _(
            getAndCacheContractMeta({
                address,
                chainID: Number(transaction.chainId),
            }),
        )

        return {
            contractName: contractData?.contractName || null,
            contractSymbol: contractData?.tokenSymbol || null,
            contractAddress: address,
            decimals: contractData?.decimals || null,
            chainID: Number(transaction.chainId),
            contractType: contractData?.type ?? 'OTHER',
            event: {
                eventName: log.name,
                logIndex: log.logIndex,
                params: events,
                ...(!log.decoded && { decoded: log.decoded }),
            },
        } as Interaction
    })

export const decodeLogs = ({ logs, transaction }: { logs: readonly Log[]; transaction: GetTransactionReturnType }) =>
    Effect.gen(function* (_) {
        const effects = logs.filter((log) => log.topics.length > 0).map((logItem) => decodedLog(transaction, logItem))

        const eithers = effects.map((e) => Effect.either(e))

        return yield* _(
            Effect.all(eithers, {
                concurrency: 'unbounded',
            }),
        )
    })
