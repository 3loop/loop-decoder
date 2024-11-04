import { getProvider, RPCProviderLive } from './rpc-provider'
import { Effect, Layer } from 'effect'
import {
  DecodedTransaction,
  DecodeResult,
  decodeCalldata as calldataDecoder,
  decodeTransactionByHash,
  EtherscanV2StrategyResolver,
  FetchTransactionError,
  FourByteStrategyResolver,
  OpenchainStrategyResolver,
  RPCFetchError,
  SourcifyStrategyResolver,
  UnknownNetwork,
  UnsupportedEvent,
} from '@3loop/transaction-decoder'
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import { Hex } from 'viem'
import { DatabaseLive } from './database'
import { SqlError } from '@effect/sql/SqlError'
import { ConfigError } from 'effect/ConfigError'
import { ParseError } from 'effect/ParseResult'

const AbiStoreLive = SqlAbiStore.make({
  default: [
    EtherscanV2StrategyResolver({
      apikey: process.env.ETHERSCAN_API_KEY,
    }),
    SourcifyStrategyResolver(),
    OpenchainStrategyResolver(),
    FourByteStrategyResolver(),
  ],
})

const MetaStoreLive = SqlContractMetaStore.make()

const DataLayer = Layer.mergeAll(RPCProviderLive, DatabaseLive)
const LoadersLayer = Layer.mergeAll(AbiStoreLive, MetaStoreLive)
const MainLayer = Layer.provideMerge(LoadersLayer, DataLayer)

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number
  hash: string
}): Promise<DecodedTransaction | undefined> {
  // NOTE: For unknonw reason the context of main layer is still missing the SqlClient in the type
  const runnable = Effect.provide(decodeTransactionByHash(hash as Hex, chainID), MainLayer) as Effect.Effect<
    DecodedTransaction,
    | SqlError
    | UnknownNetwork
    | ConfigError
    | SqlError
    | RPCFetchError
    | ParseError
    | UnsupportedEvent
    | FetchTransactionError,
    never
  >
  return Effect.runPromise(runnable).catch((error: unknown) => {
    console.error('Decode error', JSON.stringify(error, null, 2))
    return undefined
  })
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
  const runnable = Effect.provide(
    calldataDecoder({
      data: data as Hex,
      chainID,
      contractAddress,
    }),
    MainLayer,
  ) as Effect.Effect<
    DecodeResult,
    | SqlError
    | UnknownNetwork
    | ConfigError
    | SqlError
    | RPCFetchError
    | ParseError
    | UnsupportedEvent
    | FetchTransactionError,
    never
  >
  return Effect.runPromise(runnable).catch((error: unknown) => {
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
