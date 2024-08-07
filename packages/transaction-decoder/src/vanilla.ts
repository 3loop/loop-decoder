import { Effect, Context, Logger, LogLevel, RequestResolver } from 'effect'
import { PublicClient, PublicClientObject, UnknownNetwork } from './public-client.js'
import { decodeTransactionByHash, decodeCalldata } from './transaction-decoder.js'
import { ContractAbiResult, AbiStore as EffectAbiStore, AbiParams } from './abi-loader.js'
import {
  ContractMetaParams,
  ContractMetaResult,
  ContractMetaStore as EffectContractMetaStore,
} from './contract-meta-loader.js'
import type { ContractAbiResolverStrategy } from './abi-strategy/index.js'
import type { Hex } from 'viem'
import type { GetContractMetaStrategy } from './meta-strategy/request-model.js'

export interface TransactionDecoderOptions {
  getPublicClient: (chainID: number) => PublicClientObject | undefined
  abiStore: VanillaAbiStore
  contractMetaStore: VanillaContractMetaStore
  logging?: boolean
}

export interface VanillaAbiStore {
  strategies?: readonly ContractAbiResolverStrategy[]
  get: (key: AbiParams) => Promise<ContractAbiResult>
  set: (key: AbiParams, val: ContractAbiResult) => Promise<void>
}

type VanillaContractMetaStategy = (client: PublicClient) => RequestResolver.RequestResolver<GetContractMetaStrategy>

export interface VanillaContractMetaStore {
  strategies?: readonly VanillaContractMetaStategy[]
  get: (key: ContractMetaParams) => Promise<ContractMetaResult>
  set: (key: ContractMetaParams, val: ContractMetaResult) => Promise<void>
}

// TODO: allow adding custom strategies to vanilla API
export class TransactionDecoder {
  private readonly context: Context.Context<EffectAbiStore | EffectContractMetaStore | PublicClient>
  private readonly logging: boolean

  constructor({ getPublicClient, abiStore, contractMetaStore, logging = false }: TransactionDecoderOptions) {
    this.logging = logging

    const PublicClientLive = PublicClient.of({
      _tag: 'PublicClient',
      getPublicClient: (chainID) => {
        return Effect.try({
          try: () => {
            const provider = getPublicClient(chainID)
            if (provider == null) {
              throw new Error(`Provider for chain ${chainID} not found`)
            }
            return provider
          },
          catch: () => new UnknownNetwork(chainID),
        })
      },
    })

    const AbiStoreLive = EffectAbiStore.of({
      strategies: { default: abiStore.strategies ?? [] },
      get: (key) => Effect.promise(() => abiStore.get(key)),
      set: (key, val) => Effect.promise(() => abiStore.set(key, val)),
    })

    const contractMetaStrategies = contractMetaStore.strategies?.map((strategy) => strategy(PublicClientLive))

    const MetaStoreLive = EffectContractMetaStore.of({
      strategies: { default: contractMetaStrategies ?? [] },
      get: (key) => Effect.promise(() => contractMetaStore.get(key)),
      set: (key, val) => Effect.promise(() => contractMetaStore.set(key, val)),
    })

    this.context = Context.empty().pipe(
      Context.add(PublicClient, PublicClientLive),
      Context.add(EffectAbiStore, AbiStoreLive),
      Context.add(EffectContractMetaStore, MetaStoreLive),
    )
  }

  decodeTransaction({ chainID, hash }: { chainID: number; hash: string }) {
    const program = Effect.gen(function* () {
      return yield* decodeTransactionByHash(hash as Hex, chainID)
    }).pipe(Logger.withMinimumLogLevel(this.logging ? LogLevel.Debug : LogLevel.Error))

    const runnable = Effect.provide(program, this.context)

    return Effect.runPromise(runnable)
  }

  decodeCalldata({ data, chainID, contractAddress }: { data: Hex; chainID?: number; contractAddress?: string }) {
    const program = Effect.gen(function* () {
      return yield* decodeCalldata({ data, chainID, contractAddress })
    }).pipe(Logger.withMinimumLogLevel(this.logging ? LogLevel.Debug : LogLevel.Error))

    const runnable = Effect.provide(program, this.context)

    return Effect.runPromise(runnable)
  }
}
