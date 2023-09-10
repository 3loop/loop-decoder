import { Effect, Request, RequestResolver } from 'effect'
import { RPCProvider, RPCFetchError, UnknownNetwork } from '../provider.js'

const storageSlots = [
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', //eipEIP1967
    '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3', //zeppelin
]

const zeroSlot = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface GetStorageSlot extends Request.Request<RPCFetchError | UnknownNetwork, string | undefined> {
    readonly _tag: 'GetStorageSlot'
    readonly address: string
    readonly chainID: number
}

export const GetStorageSlot = Request.tagged<GetStorageSlot>('GetStorageSlot')

export const GetStorageSlotResolver = RequestResolver.fromFunctionEffect((request: GetStorageSlot) =>
    Effect.gen(function* (_) {
        const service = yield* _(RPCProvider)
        const provider = yield* _(service.getProvider(request.chainID))
        const effects = storageSlots.map((slot) =>
            Effect.tryPromise({
                try: async () => {
                    const stringRes: string = await provider.getStorage(request.address, slot)

                    if (stringRes === zeroSlot) return undefined

                    const res = '0x' + stringRes.slice(stringRes.length - 40)

                    if (res === '') return undefined

                    return res
                },
                catch: () => new RPCFetchError('Get storage'),
            }),
        )

        const res = yield* _(Effect.all(effects, { concurrency: 'unbounded' }))
        return res.find((x) => x != null)
    }),
).pipe(RequestResolver.contextFromEffect)

export const getProxyStorageSlot = ({ address, chainID }: { address: string; chainID: number }) =>
    Effect.request(GetStorageSlot({ address, chainID }), GetStorageSlotResolver).pipe(Effect.withRequestCaching(true))
