import { Effect, Logger, LogLevel, RequestResolver, ManagedRuntime, Layer } from 'effect'
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
  abiStore: VanillaAbiStore | Layer.Layer<EffectAbiStore<AbiParams, ContractAbiResult>>
  contractMetaStore:
    | VanillaContractMetaStore
    | Layer.Layer<EffectContractMetaStore<ContractMetaParams, ContractMetaResult>>
  logLevel?: LogLevel.Literal
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
  private readonly runtime: ManagedRuntime.ManagedRuntime<
    | PublicClient
    | EffectAbiStore<AbiParams, ContractAbiResult>
    | EffectContractMetaStore<ContractMetaParams, ContractMetaResult>,
    never
  >

  constructor({ getPublicClient, abiStore, contractMetaStore, logLevel = 'Error' }: TransactionDecoderOptions) {
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

    let AbiStoreLive: Layer.Layer<EffectAbiStore<AbiParams, ContractAbiResult>>

    if (Layer.isLayer(abiStore)) {
      AbiStoreLive = abiStore as Layer.Layer<EffectAbiStore<AbiParams, ContractAbiResult>>
    } else {
      const store = abiStore as VanillaAbiStore
      AbiStoreLive = Layer.succeed(
        EffectAbiStore,
        EffectAbiStore.of({
          strategies: { default: store.strategies ?? [] },
          get: (key) => Effect.promise(() => store.get(key)),
          set: (key, val) => Effect.promise(() => store.set(key, val)),
        }),
      )
    }

    let MetaStoreLive: Layer.Layer<EffectContractMetaStore<ContractMetaParams, ContractMetaResult>>

    if (Layer.isLayer(contractMetaStore)) {
      MetaStoreLive = contractMetaStore as Layer.Layer<EffectContractMetaStore<ContractMetaParams, ContractMetaResult>>
    } else {
      const store = contractMetaStore as VanillaContractMetaStore
      MetaStoreLive = Layer.succeed(
        EffectContractMetaStore,
        EffectContractMetaStore.of({
          strategies: { default: (store.strategies ?? [])?.map((strategy) => strategy(PublicClientLive)) },
          get: (key) => Effect.promise(() => store.get(key)),
          set: (key, val) => Effect.promise(() => store.set(key, val)),
        }),
      )
    }

    const LoadersLayer = Layer.provideMerge(AbiStoreLive, MetaStoreLive)
    const MainLayer = Layer.provideMerge(Layer.succeed(PublicClient, PublicClientLive), LoadersLayer).pipe(
      Layer.provide(Logger.minimumLogLevel(LogLevel.fromLiteral(logLevel))),
    )

    this.runtime = ManagedRuntime.make(MainLayer)
  }

  decodeTransaction({ chainID, hash }: { chainID: number; hash: string }) {
    const program = Effect.gen(function* () {
      return yield* decodeTransactionByHash(hash as Hex, chainID)
    })

    return this.runtime.runPromise(program)
  }

  decodeCalldata({ data, chainID, contractAddress }: { data: Hex; chainID?: number; contractAddress?: string }) {
    const program = Effect.gen(function* () {
      return yield* decodeCalldata({ data, chainID, contractAddress })
    })

    return this.runtime.runPromise(program)
  }
}
