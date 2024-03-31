import { Context, Effect, RequestResolver } from 'effect'
import { ContractData } from './types.js'
import { GetContractMetaStrategy } from './meta-strategy/request-model.js'
import { Address } from 'viem'

export interface ContractMetaParams {
    address: string
    chainID: number
}

type ChainOrDefault = number | 'default'

// NOTE: Maybe we can avoid passing RPCProvider and let the user provide it?
export interface ContractMetaStore<Key = ContractMetaParams, Value = ContractData> {
    readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractMetaStrategy>[]>
    readonly set: (arg: Key, value: Value) => Effect.Effect<never, never, void>
    readonly get: (arg: Key) => Effect.Effect<never, never, Value | null>
}

export const ContractMetaStore = Context.Tag<ContractMetaStore>('@3loop-decoder/ContractMetaStore')

export const getAndCacheContractMeta = ({
    chainID,
    address,
}: {
    readonly chainID: number
    readonly address: Address
}) =>
    Effect.gen(function* (_) {
        const contractMetaStore = yield* _(ContractMetaStore)

        const cached = yield* _(contractMetaStore.get({ address: address.toLowerCase(), chainID }))
        if (cached != null) {
            return cached
        }

        const strategies = contractMetaStore.strategies
        const allAvailableStrategies = [...(strategies[chainID] ?? []), ...strategies.default]

        const request = GetContractMetaStrategy({
            address,
            chainID,
        })

        const contractMeta = yield* _(
            Effect.validateFirst(allAvailableStrategies, (strategy) => Effect.request(request, strategy)).pipe(
                Effect.catchAll(() => Effect.succeed(null)),
            ),
        )

        if (contractMeta != null) {
            yield* _(contractMetaStore.set({ address: address.toLowerCase(), chainID }, contractMeta))
            return contractMeta
        }

        return null
    })
