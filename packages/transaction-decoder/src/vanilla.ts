import { Effect, Context, RequestResolver, Logger, LogLevel } from 'effect'
import { RPCProvider, UnknownNetwork } from './provider.js'
import {
    ContractLoader,
    GetContractABI,
    GetContractMeta,
    MissingABIError,
    MissingContractMetaError,
} from './contract-loader.js'
import { type JsonRpcProvider } from 'ethers'
import { ContractData } from './types.js'
import { decodeTransactionByHash } from './transaction-decoder.js'

interface TransactionDecoderOptions {
    getProvider: (chainID: number) => JsonRpcProvider | undefined
    getContractMeta: (_: { address: string; chainID: number }) => Promise<ContractData | null>
    getContractAbi: (_: {
        address: string
        signature?: string | undefined
        event?: string | undefined
        chainID: number
    }) => Promise<string | null>
    logging?: boolean
}

export class TransactionDecoder {
    private readonly context: Context.Context<ContractLoader | RPCProvider>
    private readonly logging: boolean

    constructor({ getProvider, getContractAbi, getContractMeta, logging = false }: TransactionDecoderOptions) {
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

        const contractABIResolver = RequestResolver.fromFunctionEffect((req: GetContractABI) =>
            Effect.tryPromise({
                try: () => getContractAbi(req),
                catch: () => new MissingABIError(req.address, req.chainID),
            }),
        )

        const contractMetaResolver = RequestResolver.fromFunctionEffect((request: GetContractMeta) =>
            Effect.tryPromise({
                try: () => getContractMeta(request),
                catch: () => new MissingContractMetaError(request.address, request.chainID),
            }),
        )

        const ContractLoaderLive = ContractLoader.of({
            _tag: 'ContractLoader',
            contractABIResolver,
            contractMetaResolver,
        })

        this.context = Context.empty().pipe(
            Context.add(RPCProvider, RPCProviderLive),
            Context.add(ContractLoader, ContractLoaderLive),
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
