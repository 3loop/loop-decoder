import { Effect, Context, Logger, LogLevel, RequestResolver } from 'effect'
import { PublicClient, PublicClientObject, UnknownNetwork } from './public-client.js'
import { ContractData } from './types.js'
import { decodeTransactionByHash } from './transaction-decoder.js'
import { AbiStore as EffectAbiStore, GetAbiParams } from './abi-loader.js'
import { ContractMetaParams, ContractMetaStore as EffectContractMetaStore } from './contract-meta-loader.js'
import { ContractABI, GetContractABIStrategy } from './abi-strategy/index.js'
import { Hex } from 'viem'

export interface TransactionDecoderOptions {
    getPublicClient: (chainID: number) => PublicClientObject | undefined
    abiStore: VanillaAbiStore
    contractMetaStore: VanillaContractMetaStore
    logging?: boolean
}

export interface VanillaAbiStore {
    strategies?: readonly RequestResolver.RequestResolver<GetContractABIStrategy>[]
    get: (key: GetAbiParams) => Promise<string | null>
    set: (val: ContractABI) => Promise<void>
}

export interface VanillaContractMetaStore {
    get: (key: ContractMetaParams) => Promise<ContractData | null>
    set: (key: ContractMetaParams, val: ContractData) => Promise<void>
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
            set: (val) => Effect.promise(() => abiStore.set(val)),
        })

        const MockedMetaStoreLive = EffectContractMetaStore.of({
            get: (key) => Effect.promise(() => contractMetaStore.get(key)),
            set: (key, val) => Effect.promise(() => contractMetaStore.set(key, val)),
        })

        this.context = Context.empty().pipe(
            Context.add(PublicClient, PublicClientLive),
            Context.add(EffectAbiStore, AbiStoreLive),
            Context.add(EffectContractMetaStore, MockedMetaStoreLive),
        )
    }

    decodeTransaction({ chainID, hash }: { chainID: number; hash: string }) {
        const program = Effect.gen(function* (_) {
            return yield* _(decodeTransactionByHash(hash as Hex, chainID))
        }).pipe(Logger.withMinimumLogLevel(this.logging ? LogLevel.Debug : LogLevel.Error))

        const runnable = Effect.provide(program, this.context)

        return Effect.runPromise(runnable)
    }
}
