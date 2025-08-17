import { getProvider, RPCProviderLive } from './rpc-provider'
import { Config, Effect, Layer, Logger, LogLevel, ManagedRuntime, Request } from 'effect'
import {
  DecodedTransaction,
  DecodeResult,
  decodeCalldata as calldataDecoder,
  decodeTransactionByHash,
  EtherscanV2StrategyResolver,
  ExperimentalErc20AbiStrategyResolver,
  FourByteStrategyResolver,
  OpenchainStrategyResolver,
  SourcifyStrategyResolver,
  PublicClient,
  ERC20RPCStrategyResolver,
  NFTRPCStrategyResolver,
  ProxyRPCStrategyResolver,
} from '@3loop/transaction-decoder'
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import { Hex } from 'viem'
import { DatabaseLive } from './database'

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const level = LogLevel.Warning
    return Logger.minimumLogLevel(level)
  }),
)

const AbiStoreLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const service = yield* PublicClient
    const apikey = yield* Config.withDefault(Config.string('ETHERSCAN_API_KEY'), undefined)
    return SqlAbiStore.make({
      default: [
        EtherscanV2StrategyResolver({
          apikey: apikey,
        }),
        ExperimentalErc20AbiStrategyResolver(service),
        OpenchainStrategyResolver(),
        SourcifyStrategyResolver(),
        FourByteStrategyResolver(),
      ],
    })
  }),
)

const MetaStoreLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const service = yield* PublicClient

    return SqlContractMetaStore.make({
      default: [ERC20RPCStrategyResolver(service), NFTRPCStrategyResolver(service), ProxyRPCStrategyResolver(service)],
    })
  }),
)
const CacheLayer = Layer.setRequestCache(Request.makeCache({ capacity: 100, timeToLive: '60 minutes' }))
const DataLayer = Layer.mergeAll(RPCProviderLive, DatabaseLive)
const LoadersLayer = Layer.mergeAll(AbiStoreLive, MetaStoreLive)

const MainLayer = Layer.provideMerge(LoadersLayer, DataLayer).pipe(Layer.provide(LogLevelLive))

const runtime = ManagedRuntime.make(Layer.provide(MainLayer, CacheLayer))

interface DecodeTransactionResult {
  decoded?: DecodedTransaction
  error?: string
}

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number
  hash: string
}): Promise<DecodeTransactionResult> {
  // NOTE: For unknonw reason the context of main layer is still missing the SqlClient in the type
  const runnable = decodeTransactionByHash(hash as Hex, chainID)

  const startTime = performance.now()

  try {
    const result = await runtime.runPromise(runnable)
    const endTime = performance.now()
    console.log(`Decode transaction took ${endTime - startTime}ms`)
    return { decoded: result }
  } catch (error: unknown) {
    const endTime = performance.now()
    const message = error instanceof Error ? error.message : 'Failed to decode transaction'
    console.log(message)
    console.log(`Failed decode transaction took ${endTime - startTime}ms`)
    return {
      error:
        'Transaction decoding failed. Please check if you have selected the correct chain. \n\n Note that this is a demo playground and we may not be able to retrieve the data for this particular transaction or contract with our test Data Loaders.',
    }
  }
}

export async function decodeCalldata({
  chainID,
  data,
  contractAddress,
}: {
  chainID?: number
  data: string
  contractAddress?: string
}): Promise<DecodeResult | undefined> {
  const runnable = calldataDecoder({
    data: data as Hex,
    chainID,
    contractAddress,
  })

  return runtime.runPromise(runnable).catch((error: unknown) => {
    console.error('Decode error', JSON.stringify(error, null, 2))
    return undefined
  })
}

export async function getRawCalldata(
  hash: string,
  chainID: number,
): Promise<{ data: string; contractAddress: string } | undefined> {
  try {
    const provider = getProvider(chainID)
    if (provider != null) {
      const transaction = await provider.client.getTransaction({ hash: hash as Hex })
      return {
        data: transaction.input,
        contractAddress: transaction.to ?? '',
      }
    }
  } catch (error) {
    console.error('Error getting raw calldata', error)
    return undefined
  }
}
