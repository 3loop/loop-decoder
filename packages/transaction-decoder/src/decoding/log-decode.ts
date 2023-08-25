import type { Log, TransactionResponse } from 'ethers'
import { Interface } from 'ethers'
import { Effect } from 'effect'
import type { Interaction, RawDecodedLog } from '../types.js'
import { ContractType } from '../types.js'
import { ContractLoader, GetContractABI, GetContractMeta } from '../contract-loader.js'

const decodedLog = (transaction: TransactionResponse, logItem: Log) =>
    Effect.gen(function* (_) {
        const service = yield* _(ContractLoader)

        const address = logItem.address.toLowerCase()

        const blankRawLog: RawDecodedLog = {
            name: null,
            events: [],
            address: logItem.address,
            logIndex: logItem.index,
            decoded: false,
        }

        const abiItem = yield* _(
            Effect.request(
                GetContractABI({
                    address,
                    signature: logItem.topics[0],
                    chainID: Number(transaction.chainId),
                }),
                service.contractABIResolver,
            ).pipe(
                Effect.withRequestCaching(true),
                Effect.catchAll(() => Effect.succeed(null)),
            ),
        )

        if (abiItem == null) {
            return blankRawLog
        }

        const iface = yield* _(Effect.sync(() => new Interface(abiItem)))

        const decodedData = iface.parseLog({
            topics: [...logItem.topics],
            data: logItem.data,
        })

        interface DecodedParam {
            name: string
            value: string
        }

        const decodedParams = yield* _(
            Effect.try({
                try: () =>
                    decodedData?.args.map((arg, index) => {
                        const name = decodedData.fragment.inputs[index].name

                        return {
                            name,
                            value: arg.toString(),
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
        const service = yield* _(ContractLoader)

        const events = Object.fromEntries(
            log.events.map((param) => [
                param.name,
                // Array.isArray(param.value) ? param.value.map((arg) => arg.value) :
                param.value,
            ]) ?? [],
        )

        // NOTE: Can use a common parser with branded type evrywhere
        const address = log.address.toLowerCase()

        const contractData = yield* _(
            Effect.request(
                GetContractMeta({
                    address,
                    chainID: Number(transaction.chainId),
                }),
                service.contractMetaResolver,
            ).pipe(
                Effect.withRequestCaching(true),
                Effect.catchAll(() => Effect.succeed(null)),
            ),
        )

        return {
            contractName: contractData?.contractName || null,
            contractSymbol: contractData?.tokenSymbol || null,
            contractAddress: address,
            decimals: contractData?.decimals || null,
            chainID: Number(transaction.chainId),
            contractType: contractData?.type ?? ContractType.OTHER,
            events: [
                {
                    eventName: log.name,
                    logIndex: log.logIndex,
                    params: events,
                    ...(!log.decoded && { decoded: log.decoded }),
                },
            ],
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

        const interactions = yield* _(
            Effect.all(effects, {
                concurrency: 'unbounded',
            }),
        )

        return interactions.reduce<Interaction[]>((acc, interaction) => {
            const existingInteraction = acc.find((i) => i.contractAddress === interaction.contractAddress)

            if (existingInteraction) {
                existingInteraction.events.push(...interaction.events)
                return acc
            }
            return [...acc, interaction]
        }, [])
    })
