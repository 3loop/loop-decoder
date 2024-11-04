import { getProvider, RPCProviderLive } from './rpc-provider'
import {
  decodeTransactionByHash,
  type DecodedTransaction,
  decodeCalldata as calldataDecoder,
  DecodeResult,
} from '@3loop/transaction-decoder'
import { Config, Effect, Layer } from 'effect'
import {
  EtherscanStrategyResolver,
  FourByteStrategyResolver,
  OpenchainStrategyResolver,
  SourcifyStrategyResolver,
} from '@3loop/transaction-decoder'
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import { Hex } from 'viem'
import { DatabaseLive } from './database'

const AbiStoreLive = SqlAbiStore.make({
  default: [
    EtherscanStrategyResolver({
      apikey: process.env.ETHERSCAN_API_KEY,
    }),
    SourcifyStrategyResolver(),
    OpenchainStrategyResolver(),
    FourByteStrategyResolver(),
  ],
})

const LoadersLayer = Layer.mergeAll(AbiStoreLive, SqlContractMetaStore.make())
const DataLayer = Layer.mergeAll(DatabaseLive, RPCProviderLive)
const MainLayer = Layer.provideMerge(LoadersLayer, DataLayer)

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number
  hash: string
}): Promise<DecodedTransaction | undefined> {
  const runnable = Effect.provide(decodeTransactionByHash(hash as Hex, chainID), MainLayer)
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
  )
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
