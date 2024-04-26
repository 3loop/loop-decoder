import { Effect, Either } from 'effect'
import { type Hash, type GetTransactionReturnType, type TransactionReceipt, isAddress, formatEther, Abi } from 'viem'
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
import { chainIdToNetwork } from './helpers/networks.js'

export class UnsupportedEvent {
  readonly _tag = 'UnsupportedEvent'
  constructor(readonly event: string) {}
}

export class UnknownContract {
  readonly _tag = 'UnknownContract'
  constructor(readonly address: string) {}
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

export const decodeMethod = ({ transaction }: { transaction: GetTransactionReturnType }) =>
  Effect.gen(function* () {
    if (transaction.to == null) {
      return yield* Effect.die(new UnsupportedEvent('Contract creation'))
    }

    if (!('input' in transaction)) {
      return yield* Effect.die(new UnsupportedEvent('Unsupported transaction'))
    }

    const data = transaction.input

    const signature = data.slice(0, 10)
    const chainID = Number(transaction.chainId)
    let abiAddress = transaction.to

    //if contract is a proxy, get the implementation address
    const implementation = yield* getProxyStorageSlot({ address: abiAddress, chainID })

    if (implementation) {
      abiAddress = implementation
    }

    const abi_ = yield* getAndCacheAbi({
      address: abiAddress,
      signature,
      chainID,
    })

    if (!abi_) {
      return yield* Effect.fail(new AbiDecoder.MissingABIError(abiAddress, signature, chainID))
    }

    const abi = JSON.parse(abi_) as Abi

    // TODO: Pass the error message, so we can easier debug
    const decoded = yield* Effect.try({
      try: () => AbiDecoder.decodeMethod(data, abi),
      catch: (e) => {
        return new AbiDecoder.DecodeError(e)
      },
    })

    if (decoded == null) {
      return yield* Effect.fail(new AbiDecoder.DecodeError(`Failed to decode method: ${transaction.input}`))
    }

    return decoded
  })

export const decodeLogs = ({
  transaction,
  receipt,
}: {
  transaction: GetTransactionReturnType
  receipt: TransactionReceipt
}) =>
  Effect.gen(function* () {
    return yield* LogDecoder.decodeLogs({
      logs: receipt.logs,
      transaction,
    })
  })

export const decodeTrace = ({ trace, transaction }: { trace: TraceLog[]; transaction: GetTransactionReturnType }) =>
  Effect.gen(function* () {
    return yield* TraceDecoder.decodeTransactionTrace({
      trace,
      transaction,
    })
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
      if (typeof param.value === 'string' && isAddress(param.value)) {
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
  transaction: GetTransactionReturnType
  receipt: TransactionReceipt
  trace: TraceLog[]
  timestamp: number
}) =>
  Effect.gen(function* () {
    const { decodedData, decodedTrace, decodedLogs } = yield* Effect.all(
      {
        decodedData: decodeMethod({ transaction }),
        decodedTrace: decodeTrace({ trace, transaction }),
        decodedLogs: decodeLogs({ receipt, transaction }),
      },
      {
        batching: true,
        concurrency: 'unbounded',
      },
    )

    const decodedLogsRight = decodedLogs.filter(Either.isRight).map((r) => r.right)
    const decodedTraceRight = decodedTrace.filter(Either.isRight).map((r) => r.right)

    const logsErrors = decodedLogs.filter(Either.isLeft).map((r) => r.left)
    if (logsErrors.length > 0) {
      yield* Effect.logError(`Logs decode errors: ${JSON.stringify(logsErrors)}`)
    }

    const traceErrors = decodedTrace.filter(Either.isLeft).map((r) => r.left)
    if (traceErrors.length > 0) {
      yield* Effect.logError(`Trace decode errors: ${JSON.stringify(traceErrors)}`)
    }
    const interpreterMap = yield* getAndCacheContractMeta({
      address: receipt.to!,
      chainID: Number(transaction.chainId),
    })

    const interactions: Interaction[] = TraceDecoder.augmentTraceLogs(transaction, decodedLogsRight, trace)

    const value = transaction.value.toString()

    const effectiveGasPrice = receipt.effectiveGasPrice ?? BigInt(0)
    const gasPaid = formatEther(receipt.gasUsed * effectiveGasPrice)

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
      // NOTE: Explore how to set assets for more flexible tracking of the in and out addresses
      assetsReceived: getAssetsReceived(interactions, receipt.from),
      assetsSent: getAssetsSent(interactions, value, receipt.from, receipt.from),
      interactedAddresses: collectAllAddresses({ interactions, decodedData }),
    }

    return decodedTx
  })

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

    if (!receipt || !transaction || !trace) {
      return yield* Effect.fail(new FetchTransactionError({ hash, chainID }))
    }

    const timestamp = yield* getBlockTimestamp(receipt.blockNumber, chainID)

    if (!receipt.to) {
      return yield* Effect.fail(new UnsupportedEvent('Contract creation'))
    } else if (transaction.input === '0x') {
      return yield* Effect.sync(() => transferDecode({ transaction, receipt }))
    }
    return yield* decodeTransaction({
      transaction,
      receipt,
      trace,
      timestamp: Number(timestamp),
    })
  })
