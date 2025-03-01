import { Effect, Logger, LogLevel, ManagedRuntime, Layer } from 'effect'
import { PublicClient, PublicClientObject, UnknownNetwork } from './public-client.js'
import { decodeTransactionByHash, decodeCalldata } from './transaction-decoder.js'
import * as EffectAbiStore from './abi-store.js'
import * as EffectContractMetaStore from './contract-meta-store.js'
import type { ContractAbiResolverStrategy } from './abi-strategy/index.js'
import type { Hex } from 'viem'
import type { ContractMetaResolverStrategy } from './meta-strategy/request-model.js'

export interface TransactionDecoderOptions {
  getPublicClient: (chainID: number) => PublicClientObject | undefined
  abiStore: VanillaAbiStore | Layer.Layer<EffectAbiStore.AbiStore>
  contractMetaStore:
    | VanillaContractMetaStore
    | Layer.Layer<EffectContractMetaStore.ContractMetaStore, never, PublicClient>
  logLevel?: LogLevel.Literal
}

export interface VanillaAbiStore {
  strategies?: readonly ContractAbiResolverStrategy[]
  get: (key: EffectAbiStore.AbiParams) => Promise<EffectAbiStore.ContractAbiResult>
  set: (key: EffectAbiStore.AbiParams, val: EffectAbiStore.ContractAbiResult) => Promise<void>
}

type VanillaContractMetaStategy = (client: PublicClient) => ContractMetaResolverStrategy

export interface VanillaContractMetaStore {
  strategies?: readonly VanillaContractMetaStategy[]
  get: (key: EffectContractMetaStore.ContractMetaParams) => Promise<EffectContractMetaStore.ContractMetaResult>
  set: (
    key: EffectContractMetaStore.ContractMetaParams,
    val: EffectContractMetaStore.ContractMetaResult,
  ) => Promise<void>
}

// TODO: allow adding custom strategies to vanilla API
export class TransactionDecoder {
  private readonly runtime: ManagedRuntime.ManagedRuntime<
    PublicClient | EffectAbiStore.AbiStore | EffectContractMetaStore.ContractMetaStore,
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

    let AbiStoreLive: Layer.Layer<EffectAbiStore.AbiStore>

    if (Layer.isLayer(abiStore)) {
      AbiStoreLive = abiStore as Layer.Layer<EffectAbiStore.AbiStore>
    } else {
      const store = abiStore as VanillaAbiStore
      AbiStoreLive = EffectAbiStore.layer({
        strategies: { default: store.strategies ?? [] },
        get: (key) => Effect.promise(() => store.get(key)),
        set: (key, val) => Effect.promise(() => store.set(key, val)),
      })
    }

    let MetaStoreLive: Layer.Layer<EffectContractMetaStore.ContractMetaStore, never, PublicClient>

    if (Layer.isLayer(contractMetaStore)) {
      MetaStoreLive = contractMetaStore as Layer.Layer<EffectContractMetaStore.ContractMetaStore>
    } else {
      const store = contractMetaStore as VanillaContractMetaStore
      MetaStoreLive = EffectContractMetaStore.layer({
        strategies: { default: (store.strategies ?? [])?.map((strategy) => strategy(PublicClientLive)) },
        get: (key) => Effect.promise(() => store.get(key)),
        set: (key, val) => Effect.promise(() => store.set(key, val)),
      })
    }

    const LoadersLayer = Layer.provideMerge(AbiStoreLive, MetaStoreLive)
    const MainLayer = LoadersLayer.pipe(
      Layer.provideMerge(Layer.succeed(PublicClient, PublicClientLive)),
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
