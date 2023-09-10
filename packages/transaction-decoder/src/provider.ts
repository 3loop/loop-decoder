import type { Networkish, JsonRpcApiProviderOptions } from 'ethers'
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

export interface RPCProvider {
    readonly _tag: 'RPCProvider'
    readonly getProvider: (chainID: number) => Effect.Effect<never, UnknownNetwork, JsonRpcProvider>
}

export const RPCProvider = Context.Tag<RPCProvider>('@3loop-decoder/RPCProvider')

export const RPCProviderLayer = (url: string, network?: Networkish, options?: JsonRpcApiProviderOptions) =>
    Effect.sync(() => new JsonRpcProvider(url, network, options))
