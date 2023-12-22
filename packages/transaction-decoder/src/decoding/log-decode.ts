import type { Log, TransactionResponse } from 'ethers'
import { Interface } from 'ethers'
import { Effect } from 'effect'
import type { DecodedLogEvent, Interaction, RawDecodedLog } from '../types.js'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { getAndCacheContractMeta } from '../contract-meta-loader.js'
import * as AbiDecoder from './abi-decode.js'

const decodedLog = (transaction: TransactionResponse, logItem: Log) =>
    Effect.gen(function* (_) {
        const chainID = Number(transaction.chainId)

        const address = logItem.address.toLowerCase()
        let abiAddress = address

        // //if contract is a proxy, get the implementation address
        //TODO: explore if this can be in contract-loader
        const implementation = yield* _(getProxyStorageSlot({ address: abiAddress, chainID }))

        if (implementation) {
            abiAddress = implementation
        }

        const abiItem = yield* _(
            getAndCacheAbi({
                address: abiAddress,
                event: logItem.topics[0],
                chainID,
            }),
        )

        if (abiItem == null) {
            return yield* _(Effect.fail(new AbiDecoder.MissingABIError(abiAddress, logItem.topics[0], chainID)))
        }

        const decodedData = yield* _(
            Effect.try({
                try: () => {
                    const iface = new Interface(abiItem)

                    return iface.parseLog({
                        topics: [...logItem.topics],
                        data: logItem.data,
                    })
                },
                catch: (e) => new AbiDecoder.DecodeError(e),
            }),
        )

        if (decodedData == null) {
            return yield* _(Effect.fail(new AbiDecoder.DecodeError('Could not decode log')))
        }

        const decodedParams = yield* _(
            Effect.try({
                try: () =>
                    decodedData.args.map((arg, index) => {
                        const name = decodedData.fragment.inputs[index].name
                        const type = decodedData.fragment.inputs[index].type
                        const value = Array.isArray(arg) ? arg.map((item) => item?.toString()) : arg.toString()
                        return {
                            type,
                            name,
                            value,
                        } as DecodedLogEvent
                    }),
                catch: () => [],
            }),
        )

        const rawLog: RawDecodedLog = {
            events: decodedParams,
            name: decodedData.name,
            address,
            logIndex: logItem.index,
            decoded: true,
        }

        return yield* _(transformLog(transaction, rawLog))
    })

const transformLog = (transaction: TransactionResponse, log: RawDecodedLog) =>
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

export const decodeLogs = ({ logs, transaction }: { logs: readonly Log[]; transaction: TransactionResponse }) =>
    Effect.gen(function* (_) {
        const effects = logs.filter((log) => log.topics.length > 0).map((logItem) => decodedLog(transaction, logItem))
        const eithers = effects.map((e) => Effect.either(e))

        return yield* _(
            Effect.all(eithers, {
                concurrency: 'unbounded',
            }),
        )
    })
