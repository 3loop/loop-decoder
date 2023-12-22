import { JsonRpcProvider } from 'ethers'
import { Context, Effect } from 'effect'

export class UnknownNetwork {
    readonly _tag = 'UnknownNetwork'
    constructor(readonly chainID: number) {}
}

export class RPCFetchError {
    readonly _tag = 'RPCFetchError'
    constructor(readonly reason: unknown) {}
}

export interface RPCProviderConfig {
    readonly supportTraceAPI?: boolean
}

export interface RPCProviderObject {
    provider: JsonRpcProvider
    config?: RPCProviderConfig
}

export interface RPCProvider {
    readonly _tag: 'RPCProvider'
    readonly getProvider: (chainID: number) => Effect.Effect<never, UnknownNetwork, RPCProviderObject>
}

export const RPCProvider = Context.Tag<RPCProvider>('@3loop-decoder/RPCProvider')
