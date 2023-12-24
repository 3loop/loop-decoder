import { Effect } from 'effect'
import type { TransactionReceipt, TransactionResponse } from 'ethers'
import { Network, formatEther, isAddress } from 'ethers'
import { getBlockTimestamp, getTrace, getTransaction, getTransactionReceipt } from './transaction-loader.js'
import * as AbiDecoder from './decoding/abi-decode.js'
import * as LogDecoder from './decoding/log-decode.js'
import * as TraceDecoder from './decoding/trace-decode.js'
import { transferDecode } from './decoding/transfer-decode.js'
import type { DecodeResult, DecodedTx, Interaction } from './types.js'
import { TxType } from './types.js'
import type { TraceLog } from './schema/trace.js'
import { getAssetsReceived, getAssetsSent } from './transformers/tokens.js'
import { getProxyStorageSlot } from './decoding/proxies.js'
import { getAndCacheAbi } from './abi-loader.js'
import { getAndCacheContractMeta } from './contract-meta-loader.js'
import traverse from 'traverse'

export class UnsupportedEvent {
    readonly _tag = 'UnsupportedEvent'
    constructor(readonly event: string) {}
}

export class UnknownContract {
    readonly _tag = 'UnknownContract'
    constructor(readonly address: string) {}
}

export class DecodeError {
    readonly _tag = 'DecodeError'
    constructor(readonly error: string) {}
}

export class DecodeLogsError {
    readonly _tag = 'DecodeLogsError'
    constructor(readonly cause: unknown) {}
}

export class FetchTransactionError {
    readonly _tag = 'FetchTransactionError'
    constructor(
        readonly data: {
            hash: string
            chainID: number
        },
    ) {}
}

export const decodeMethod = ({ transaction }: { transaction: TransactionResponse }) =>
    Effect.gen(function* (_) {
        if (transaction.to == null) {
            return yield* _(Effect.fail(new UnsupportedEvent('Contract creation')))
        }

        const signature = transaction.data.slice(0, 10)
        const chainID = Number(transaction.chainId)
        let abiAddress = transaction.to.toLowerCase()

        //if contract is a proxy, get the implementation address
        const implementation = yield* _(getProxyStorageSlot({ address: abiAddress, chainID }))

        if (implementation) {
            abiAddress = implementation
        }

        const abi = yield* _(
            getAndCacheAbi({
                address: abiAddress,
                signature,
                chainID,
            }),
        )

        if (!abi) {
            return yield* _(Effect.fail(new UnknownContract(transaction.to)))
        }

        // TODO: Pass the error message, so we can easier debug
        const decoded = yield* _(Effect.try(() => AbiDecoder.decodeMethod(transaction.data, abi)))

        if (decoded == null) {
            return yield* _(Effect.fail(new DecodeError(`Failed to decode method: ${transaction.data}`)))
        }

        return decoded
    })

export const decodeLogs = ({
    transaction,
    receipt,
}: {
    transaction: TransactionResponse
    receipt: TransactionReceipt
}) =>
    Effect.gen(function* (_) {
        const decodedLogs = yield* _(
            LogDecoder.decodeLogs({
                logs: receipt.logs,
                transaction,
            }),
        )

        const logs = yield* _(
            LogDecoder.transformDecodedLogs({
                decodedLogs,
                transaction,
            }),
        )

        return logs
    })

export const decodeTrace = ({ trace, transaction }: { trace: TraceLog[]; transaction: TransactionResponse }) =>
    Effect.gen(function* (_) {
        return yield* _(
            TraceDecoder.decodeTransactionTrace({
                trace,
                transaction,
            }),
        )
    })

const collectAllAddresses = ({
    interactions,
    decodedData,
}: {
    interactions: Interaction[]
    decodedData: DecodeResult
}) => {
    const addresses = new Set<string>()
    for (const interaction of interactions) {
        addresses.add(interaction.contractAddress)
        traverse(interaction.event).forEach(function (value: string) {
            if (this.isLeaf && isAddress(value)) {
                addresses.add(value)
            }
        })
    }

    if (decodedData.params) {
        for (const param of decodedData.params) {
            if (param.value && isAddress(param.value)) {
                addresses.add(param.value)
            }
        }
    }

    return [...addresses]
}

export const decodeTransaction = ({
    transaction,
    receipt,
    trace,
    timestamp,
}: {
    transaction: TransactionResponse
    receipt: TransactionReceipt
    trace: TraceLog[]
    timestamp: number
}) =>
    Effect.gen(function* (_) {
        const { decodedData, decodedTrace, decodedLogs } = yield* _(
            Effect.all(
                {
                    decodedData: decodeMethod({ transaction }),
                    decodedTrace: decodeTrace({ trace, transaction }),
                    decodedLogs: decodeLogs({ receipt, transaction }),
                },
                {
                    concurrency: 'unbounded',
                },
            ),
        )

        const interpreterMap = yield* _(
            getAndCacheContractMeta({
                address: receipt.to!,
                chainID: Number(transaction.chainId),
            }),
        )

        const interactions: Interaction[] = TraceDecoder.augmentTraceLogs(transaction, decodedLogs, trace)

        const value = transaction.value.toString()

        const effectiveGasPrice = receipt.gasPrice ?? BigInt(0)
        const gasPaid = formatEther((receipt.gasUsed * effectiveGasPrice).toString())

        const decodedTx: DecodedTx = {
            txHash: transaction.hash,
            txType: TxType.CONTRACT_INTERACTION,
            fromAddress: receipt.from,
            toAddress: receipt.to,
            contractName: interpreterMap?.contractName ?? null,
            contractType: interpreterMap?.type ?? 'OTHER',
            methodCall: {
                name: decodedData?.name ?? 'unknown',
                arguments: decodedData?.params ?? [],
            },
            traceCalls: decodedTrace,
            nativeValueSent: value,
            chainSymbol: Network.from(Number(transaction.chainId)).name,
            chainID: Number(transaction.chainId),
            interactions,
            effectiveGasPrice: receipt.gasPrice.toString(),
            gasUsed: receipt.gasUsed.toString(),
            gasPaid: gasPaid.toString(),
            timestamp,
            txIndex: receipt.index,
            reverted: receipt.status === 0, // will return true if status==undefined
            // NOTE: Explore how to set assets for more flexible tracking of the in and out addresses
            assetsReceived: getAssetsReceived(interactions, receipt.from),
            assetsSent: getAssetsSent(interactions, value, receipt.from, receipt.from),
            interactedAddresses: collectAllAddresses({ interactions, decodedData }),
        }

        return decodedTx
    })

export const decodeTransactionByHash = (hash: string, chainID: number) =>
    Effect.gen(function* (_) {
        const { transaction, receipt, trace } = yield* _(
            Effect.all(
                {
                    transaction: getTransaction(hash, chainID),
                    receipt: getTransactionReceipt(hash, chainID),
                    trace: getTrace(hash, chainID),
                },
                {
                    concurrency: 'unbounded',
                },
            ),
        )

        if (!receipt || !transaction || !trace) {
            return yield* _(Effect.fail(new FetchTransactionError({ hash, chainID })))
        }

        const timestamp = yield* _(getBlockTimestamp(receipt.blockNumber, chainID))

        if (!receipt.to) {
            return yield* _(Effect.fail(new UnsupportedEvent('Contract creation')))
        } else if (transaction.data === '0x') {
            return yield* _(Effect.sync(() => transferDecode({ transaction, receipt })))
        }
        return yield* _(
            decodeTransaction({
                transaction,
                receipt,
                trace,
                timestamp,
            }),
        )
    })
