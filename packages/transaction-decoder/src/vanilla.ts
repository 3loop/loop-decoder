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
  abiStore: VanillaAbiStore
  contractMetaStore: VanillaContractMetaStore
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

    const AbiStoreLive = Layer.succeed(
      EffectAbiStore,
      EffectAbiStore.of({
        strategies: { default: abiStore.strategies ?? [] },
        get: (key) => Effect.promise(() => abiStore.get(key)),
        set: (key, val) => Effect.promise(() => abiStore.set(key, val)),
      }),
    )

    const contractMetaStrategies = contractMetaStore.strategies?.map((strategy) => strategy(PublicClientLive))

    const MetaStoreLive = Layer.succeed(
      EffectContractMetaStore,
      EffectContractMetaStore.of({
        strategies: { default: contractMetaStrategies ?? [] },
        get: (key) => Effect.promise(() => contractMetaStore.get(key)),
        set: (key, val) => Effect.promise(() => contractMetaStore.set(key, val)),
      }),
    )

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
