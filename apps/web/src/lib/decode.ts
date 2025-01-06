import { getProvider, RPCProviderLive } from './rpc-provider'
import { Config, Effect, Layer, ManagedRuntime, Request } from 'effect'
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
  AbiStore,
  AbiParams,
  ContractAbiResult,
  ContractMetaStore,
  ContractMetaParams,
  ContractMetaResult,
  PublicClient,
  ERC20RPCStrategyResolver,
  NFTRPCStrategyResolver,
  ProxyRPCStrategyResolver,
} from '@3loop/transaction-decoder'
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import { Hex } from 'viem'
import { DatabaseLive } from './database'
import { PgClient } from '@effect/sql-pg/PgClient'
import { SqlClient } from '@effect/sql/SqlClient'
import { ConfigError } from 'effect/ConfigError'
import { SqlError } from '@effect/sql/SqlError'

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

const MainLayer = Layer.provideMerge(LoadersLayer, DataLayer) as Layer.Layer<
  | AbiStore<AbiParams, ContractAbiResult>
  | ContractMetaStore<ContractMetaParams, ContractMetaResult>
  | PublicClient
  | PgClient
  | SqlClient,
  ConfigError | SqlError,
  never
>

const runtime = ManagedRuntime.make(Layer.provide(MainLayer, CacheLayer))

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number
  hash: string
}): Promise<DecodedTransaction | undefined> {
  // NOTE: For unknonw reason the context of main layer is still missing the SqlClient in the type
  const runnable = decodeTransactionByHash(hash as Hex, chainID)

  const startTime = performance.now()

  try {
    const result = await runtime.runPromise(runnable)
    const endTime = performance.now()
    console.log(`Decode transaction took ${endTime - startTime}ms`)
    return result
  } catch (error: unknown) {
    const endTime = performance.now()
    console.error('Decode error', JSON.stringify(error, null, 2))
    console.log(`Failed decode transaction took ${endTime - startTime}ms`)
    return undefined
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
