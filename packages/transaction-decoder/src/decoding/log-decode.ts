import type { Log, TransactionResponse } from 'ethers'
import { Interface } from 'ethers'
import { Effect } from 'effect'
import type { Interaction, RawDecodedLog } from '../types.js'
import { ContractType } from '../types.js'
import { getProxyStorageSlot } from './proxies.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { getAndCacheContractMeta } from '../contract-meta-loader.js'

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

        const blankRawLog: RawDecodedLog = {
            name: null,
            events: [],
            address: logItem.address,
            logIndex: logItem.index,
            decoded: false,
        }

        const abiItem = yield* _(
            getAndCacheAbi({
                address: abiAddress,
                event: logItem.topics[0],
                chainID,
            }),
        )

        if (abiItem == null) {
            return blankRawLog
        }

        const iface = yield* _(Effect.try(() => new Interface(abiItem)))

        const decodedData = yield* _(
            Effect.try({
                try: () =>
                    iface.parseLog({
                        topics: [...logItem.topics],
                        data: logItem.data,
                    }),
                catch: () => console.error('Error decoding log', logItem),
            }),
        )

        interface DecodedParam {
            name: string
            value: string
        }

        const decodedParams = yield* _(
            Effect.try({
                try: () =>
                    decodedData?.args.map((arg, index) => {
                        const name = decodedData.fragment.inputs[index].name
                        const value = Array.isArray(arg) ? arg.map((item) => item?.toString()) : arg.toString()
                        return {
                            name,
                            value,
                        } as DecodedParam
                    }),
                catch: () => undefined,
            }),
        )

        if (decodedData != null) {
            return {
                events: decodedParams,
                name: decodedData.name,
                address,
                logIndex: logItem.index,
                decoded: true,
            } as RawDecodedLog
        }
        return blankRawLog
    })

export const decodeLogs = ({ logs, transaction }: { logs: readonly Log[]; transaction: TransactionResponse }) =>
    Effect.gen(function* (_) {
        const effects = logs.filter((log) => log.topics.length > 0).map((logItem) => decodedLog(transaction, logItem))

        return yield* _(
            Effect.all(effects, {
                concurrency: 'unbounded',
            }),
        )
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
            contractType: contractData?.type ?? ContractType.OTHER,
            event: {
                eventName: log.name,
                logIndex: log.logIndex,
                params: events,
                ...(!log.decoded && { decoded: log.decoded }),
            },
        }
    })

export const transformDecodedLogs = ({
    decodedLogs,
    transaction,
}: {
    decodedLogs: RawDecodedLog[]
    transaction: TransactionResponse
}) =>
    Effect.gen(function* (_) {
        const effects = decodedLogs.filter((log) => Boolean(log)).map((log) => transformLog(transaction, log))

        const result: Interaction[] = yield* _(
            Effect.all(effects, {
                concurrency: 'unbounded',
            }),
        )

        return result
    })
