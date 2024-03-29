import { Context, Effect } from 'effect'
import { ContractData } from './types.js'

export interface ContractMetaParams {
    address: string
    chainID: number
}

// NOTE: Maybe we can avoid passing RPCProvider and let the user provide it?
export interface ContractMetaStore<Key = ContractMetaParams, Value = ContractData> {
    readonly set: (arg: Key, value: Value) => Effect.Effect<never, never, void>
    readonly get: (arg: Key) => Effect.Effect<never, never, Value | null>
}

export const ContractMetaStore = Context.Tag<ContractMetaStore>('@3loop-decoder/ContractMetaStore')

export const getAndCacheContractMeta = ({ chainID, address }: { readonly chainID: number; readonly address: string }) =>
    Effect.gen(function* (_) {
        const contractMetaStore = yield* _(ContractMetaStore)
        const cached = yield* _(contractMetaStore.get({ address: address.toLowerCase(), chainID }))
        if (cached != null) {
            return cached
        }
        // TODO: Implement resolvers, we can auto resolve ERC20 and ERC721 contracts using RPC
        // we could also use 3rd party apis to get contract metadata
        return null
    })
