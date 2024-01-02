import { Context, Effect, RequestResolver } from 'effect'
import { ContractABI, GetContractABIStrategy } from './abi-strategy/index.js'

export interface GetAbiParams {
    chainID: number
    address: string
    event?: string | undefined
    signature?: string | undefined
}

type ChainOrDefault = number | 'default'

export interface AbiStore<Key = GetAbiParams, SetValue = ContractABI, Value = string | null> {
    readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractABIStrategy>[]>
    // NOTE: I'm not sure if this is the best abi store interface, but it works for our nosql database
    readonly set: (value: SetValue) => Effect.Effect<never, never, void>
    readonly get: (arg: Key) => Effect.Effect<never, never, Value>
}

export const AbiStore = Context.Tag<AbiStore>('@3loop-decoder/AbiStore')

export const getAndCacheAbi = ({ chainID, address, event, signature }: GetAbiParams) =>
    Effect.gen(function* (_) {
        // NOTE: skip contract loader for 0x signatures
        if (event === '0x' || signature === '0x') {
            return null
        }

        const abiStore = yield* _(AbiStore)
        const strategies = abiStore.strategies

        const cached = yield* _(abiStore.get({ chainID, address, event, signature }))
        if (cached != null) {
            return cached
        }

        const request = GetContractABIStrategy({
            address,
            event,
            signature,
            chainID,
        })

        const allAvailableStrategies = [...(strategies[chainID] ?? []), ...strategies.default]

        const abi = yield* _(
            Effect.validateFirst(allAvailableStrategies, (strategy) => Effect.request(request, strategy)).pipe(
                Effect.catchAll(() => Effect.succeed(null)),
            ),
        )

        if (abi != null) {
            yield* _(abiStore.set(abi))

            const addressmatch = abi.address?.[address]
            if (addressmatch != null) {
                return addressmatch
            }

            const funcmatch = signature ? abi.func?.[signature] : null
            if (funcmatch != null) {
                return `[${funcmatch}]`
            }

            const eventmatch = event ? abi.event?.[event] : null
            if (eventmatch != null) {
                return `[${eventmatch}]`
            }
        }

        return null
    })
