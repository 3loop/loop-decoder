import { Data, Effect, Either } from 'effect'
import { Address, formatEther, getAddress } from 'viem'
import { type Hex, type Hash, type GetTransactionReturnType, type TransactionReceipt } from 'viem'
import { getBlockTimestamp, getTrace, getTransaction, getTransactionReceipt } from './transaction-loader.js'
import * as LogDecoder from './decoding/log-decode.js'
import * as TraceDecoder from './decoding/trace-decode.js'
import * as CalldataDecode from './decoding/calldata-decode.js'
import type { DecodedTransaction, Interaction, ContractData, DecodeResult } from './types.js'
import { TxType } from './types.js'
import type { TraceLog } from './schema/trace.js'
import { getAssetTransfers } from './transformers/transfers.js'
import { getAndCacheContractMeta } from './contract-meta-loader.js'
import { chainIdToNetwork } from './helpers/networks.js'
import { stringify } from './helpers/stringify.js'
import { decodeErrorTrace } from './decoding/trace-decode.js'
import { collectAllAddresses } from './transformers/addresses.js'

export class UnsupportedEvent extends Data.TaggedError('UnsupportedEvent')<{ message: string }> {}
export class InvalidArgumentError extends Data.TaggedError('InvalidArgumentError')<{ message: string }> {}

export class FetchTransactionError extends Data.TaggedError('FetchTransactionError')<{ message: string }> {
  constructor(
    readonly data: {
      hash: string
      chainID: number
    },
  ) {
    super({ message: `Failed to fetch transaction with hash ${data.hash} on chain ${data.chainID}` })
  }
}

export const decodeLogs = ({
  transaction,
  receipt,
}: {
  transaction: GetTransactionReturnType
  receipt: TransactionReceipt
}) =>
  LogDecoder.decodeLogs({
    logs: receipt.logs,
    transaction,
  }).pipe(
    Effect.withSpan('TransactionDecoder.decodeLogs', {
      attributes: {
        logsCount: receipt.logs.length,
      },
    }),
  )

export const decodeTrace = ({ trace, transaction }: { trace: TraceLog[]; transaction: GetTransactionReturnType }) =>
  TraceDecoder.decodeTransactionTrace({
    trace,
    transaction,
  }).pipe(
    Effect.withSpan('TransactionDecoder.decodeTrace', {
      attributes: {
        traceCount: trace.length,
      },
    }),
  )

const NATIVE_TRANSFER_METHOD = Effect.succeed({
  name: 'Transfer',
  signature: 'Transfer(address,address,uint256)',
  type: 'function',
  params: [],
} as DecodeResult)

export const decodeTransaction = ({
  transaction,
  receipt,
  trace,
  timestamp,
}: {
  transaction: GetTransactionReturnType
  receipt: TransactionReceipt
  trace: TraceLog[]
  timestamp: number
}) =>
  Effect.gen(function* () {
    if (transaction.to == null) {
      return yield* Effect.fail(new UnsupportedEvent({ message: 'Contract creation' }))
    }

    if (!('input' in transaction)) {
      return yield* Effect.fail(new UnsupportedEvent({ message: 'Unsupported transaction' }))
    }

    const nativeTransfer = transaction.input === '0x'

    const data = transaction.input
    const chainID = Number(transaction.chainId)
    const contractAddress = getAddress(transaction.to)

    const { decodedData, decodedTrace, decodedLogs, decodedErrorTrace } = yield* Effect.all(
      {
        decodedData: Effect.either(
          nativeTransfer ? NATIVE_TRANSFER_METHOD : CalldataDecode.decodeMethod({ data, chainID, contractAddress }),
        ),
        decodedTrace: decodeTrace({ trace, transaction }),
        decodedLogs: decodeLogs({ receipt, transaction }),
        decodedErrorTrace: decodeErrorTrace({ trace, transaction }),
      },
      {
        batching: true,
        concurrency: 'unbounded',
      },
    )

    const decodedLogsRight = decodedLogs.filter(Either.isRight).map((r) => r.right)
    const decodedTraceRight = decodedTrace.filter(Either.isRight).map((r) => r.right)
    const decodedDataRight = Either.isRight(decodedData) ? decodedData.right : undefined
    const decodedErrorTraceRight = decodedErrorTrace.filter(Either.isRight).map((r) => r.right)

    const logsDecodeErrors = decodedLogs.filter(Either.isLeft).map((r) => r.left)
    if (logsDecodeErrors.length > 0) {
      yield* Effect.logError(`Logs decode errors: ${stringify(logsDecodeErrors)}`)
    }

    if (!nativeTransfer && Either.isLeft(decodedData)) {
      yield* Effect.logError(`Data decode error: ${decodedData.left}`)
    }

    const traceDecodeErrors = decodedTrace
      .filter(Either.isLeft)
      .map((r) => r.left)
      .filter((error, index, self) => self.findIndex((e) => e.message === error.message) === index)

    if (traceDecodeErrors.length > 0) {
      yield* Effect.logError(`Trace decode errors: ${stringify(traceDecodeErrors)}`)
    }

    const errorTraceDecodeErrors = decodedErrorTrace
      .filter(Either.isLeft)
      .map((r) => r.left)
      .filter((error, index, self) => self.findIndex((e) => e.message === error.message) === index)

    if (errorTraceDecodeErrors.length > 0) {
      yield* Effect.logError(`ErrorTrace decode errors: ${stringify(errorTraceDecodeErrors)}`)
    }

    const interactions: Interaction[] = TraceDecoder.augmentTraceLogs(transaction, decodedLogsRight, trace)

    const value = transaction.value.toString()

    const effectiveGasPrice = receipt.effectiveGasPrice ?? BigInt(0)
    const gasPaid = formatEther(receipt.gasUsed * effectiveGasPrice)
    const interactedAddresses = collectAllAddresses({ interactions, decodedData: decodedDataRight, receipt })

    const contractMetaResult = yield* Effect.all(
      interactedAddresses.map((address) => getAndCacheContractMeta({ address, chainID })),
      {
        concurrency: 'unbounded',
        batching: true,
      },
    ).pipe(
      Effect.withSpan('TransactionDecoder.getAndCacheContractMeta', {
        attributes: {
          addressesCount: interactedAddresses.length,
        },
      }),
    )

    const contractsMeta = contractMetaResult.reduce(
      (acc, meta) => {
        return meta ? { ...acc, [getAddress(meta.address)]: meta } : acc
      },
      {} as Record<Address, ContractData>,
    )

    const contractMeta = contractsMeta[contractAddress]

    const transfersResult = yield* getAssetTransfers(interactions, value, receipt.from, receipt.to!)

    if (transfersResult.errors.length > 0) {
      yield* Effect.logError(`Transfers decode errors: ${stringify(transfersResult.errors)}`)
    }

    const decodedTx: DecodedTransaction = {
      txHash: transaction.hash,
      txType: nativeTransfer ? TxType.TRANSFER : TxType.CONTRACT_INTERACTION,
      fromAddress: getAddress(receipt.from),
      toAddress: receipt.to ? getAddress(receipt.to) : null,
      contractName: contractMeta?.contractName ?? null,
      contractType: contractMeta?.type ?? 'OTHER',
      methodCall: {
        name: decodedDataRight?.name ?? data.slice(0, 10),
        type: decodedDataRight?.type ?? '',
        signature: decodedDataRight?.signature ?? '',
        params: decodedDataRight?.params,
      },
      traceCalls: decodedTraceRight,
      nativeValueSent: value,
      chainSymbol: chainIdToNetwork[Number(transaction.chainId)] ?? 'unknown',
      chainID: Number(transaction.chainId),
      interactions,
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      gasUsed: receipt.gasUsed.toString(),
      gasPaid: gasPaid.toString(),
      timestamp,
      txIndex: receipt.transactionIndex,
      reverted: receipt.status === 'reverted', // will return true if status==undefined
      transfers: transfersResult.transfers,
      interactedAddresses,
      addressesMeta: contractsMeta,
      errors: decodedErrorTraceRight.length > 0 ? decodedErrorTraceRight : null,
    }

    return decodedTx
  }).pipe(
    Effect.withSpan('TransactionDecoder.decodeTransaction', {
      attributes: {
        chainID: Number(transaction.chainId),
        txHash: transaction.hash,
      },
    }),
  )

export const decodeTransactionByHash = (hash: Hash, chainID: number) =>
  Effect.gen(function* () {
    const { transaction, receipt, trace } = yield* Effect.all(
      {
        transaction: getTransaction(hash, chainID),
        receipt: getTransactionReceipt(hash, chainID),
        trace: getTrace(hash, chainID),
      },
      {
        concurrency: 'unbounded',
        batching: true,
      },
    )

    if (!receipt || !transaction) {
      return yield* new FetchTransactionError({ hash, chainID })
    }

    const timestamp = yield* getBlockTimestamp(receipt.blockNumber, chainID)

    return yield* decodeTransaction({
      transaction,
      receipt,
      trace,
      timestamp: Number(timestamp),
    })
  }).pipe(
    Effect.withSpan('TransactionDecoder.decodeTransactionByHash', {
      attributes: {
        chainID,
        txHash: hash,
      },
    }),
  )

export const decodeCalldata = ({
  data,
  chainID,
  contractAddress,
}: {
  data: Hex
  chainID?: number
  contractAddress?: string
}) =>
  Effect.gen(function* () {
    if ((contractAddress && chainID == null) || (contractAddress == null && chainID)) {
      return yield* Effect.die(
        new InvalidArgumentError({ message: 'chainID and contractAddress must be provided together' }),
      )
    }

    return yield* CalldataDecode.decodeMethod({ data, chainID: chainID ?? 0, contractAddress: contractAddress ?? '' })
  })
