import { Effect, Context, Logger, LogLevel } from 'effect'
import { RPCProvider, UnknownNetwork } from './provider.js'
import { type JsonRpcProvider } from 'ethers'
import { ContractData } from './types.js'
import { decodeTransactionByHash } from './transaction-decoder.js'
import { AbiStore as EffectAbiStore, GetAbiParams } from './abi-loader.js'
import { ContractMetaParams, ContractMetaStore as EffectContractMetaStore } from './contract-meta-loader.js'
import { ContractABI } from './abi-strategy/index.js'

interface TransactionDecoderOptions {
    getProvider: (chainID: number) => JsonRpcProvider | undefined
    abiStore: VanillaAbiStore
    contractMetaStore: VanillaContractMetaStore
    logging?: boolean
}

interface VanillaAbiStore {
    get: (key: GetAbiParams) => Promise<string | null>
    set: (val: ContractABI) => Promise<void>
}

interface VanillaContractMetaStore {
    get: (key: ContractMetaParams) => Promise<ContractData | null>
    set: (key: ContractMetaParams, val: ContractData) => Promise<void>
}

export class TransactionDecoder {
    private readonly context: Context.Context<EffectAbiStore | EffectContractMetaStore | RPCProvider>
    private readonly logging: boolean

    constructor({ getProvider, abiStore, contractMetaStore, logging = false }: TransactionDecoderOptions) {
        this.logging = logging
        const RPCProviderLive = RPCProvider.of({
            _tag: 'RPCProvider',
            getProvider: (chainID) => {
                return Effect.try({
                    try: () => {
                        const provider = getProvider(chainID)
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
            strategies: [],
            get: (key) => Effect.promise(() => abiStore.get(key)),
            set: (val) => Effect.promise(() => abiStore.set(val)),
        })

        const MockedMetaStoreLive = EffectContractMetaStore.of({
            get: (key) => Effect.promise(() => contractMetaStore.get(key)),
            set: (key, val) => Effect.promise(() => contractMetaStore.set(key, val)),
        })

        this.context = Context.empty().pipe(
            Context.add(RPCProvider, RPCProviderLive),
            Context.add(EffectAbiStore, AbiStoreLive),
            Context.add(EffectContractMetaStore, MockedMetaStoreLive),
        )
    }

    decodeTransaction({ chainID, hash }: { chainID: number; hash: string }) {
        const program = Effect.gen(function* (_) {
            return yield* _(decodeTransactionByHash(hash, chainID))
        }).pipe(Logger.withMinimumLogLevel(this.logging ? LogLevel.Debug : LogLevel.Error))

        const runnable = Effect.provideContext(program, this.context)

        return Effect.runPromise(runnable)
    }
}
