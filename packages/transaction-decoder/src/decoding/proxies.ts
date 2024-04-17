import { Effect, Request, RequestResolver } from 'effect'
import { PublicClient, RPCFetchError, UnknownNetwork } from '../public-client.js'
import { Address, Hex } from 'viem'

const storageSlots: Hex[] = [
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', //eipEIP1967
  '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3', //zeppelin
]

const zeroSlot = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface GetStorageSlot extends Request.Request<Address | undefined, RPCFetchError | UnknownNetwork> {
  readonly _tag: 'GetStorageSlot'
  readonly address: Address
  readonly chainID: number
}

export const GetStorageSlot = Request.tagged<GetStorageSlot>('GetStorageSlot')

export const GetStorageSlotResolver = RequestResolver.fromEffect((request: GetStorageSlot) =>
  Effect.gen(function* (_) {
    const service = yield* _(PublicClient)
    const { client: publicClient } = yield* _(service.getPublicClient(request.chainID))
    // NOTE: Should we make this recursive when we have a Proxy of a Proxy?
    const effects = storageSlots.map((slot) =>
      Effect.tryPromise({
        try: async () => {
          const stringRes = await publicClient.getStorageAt({
            address: request.address,
            slot,
          })

          if (stringRes == null || stringRes === zeroSlot) return undefined

          const res = ('0x' + stringRes.slice(stringRes.length - 40)) as Address

          return res
        },
        catch: () => new RPCFetchError('Get storage'),
      }),
    )

    const res = yield* _(
      Effect.all(effects, {
        concurrency: 'inherit',
        batching: 'inherit',
      }),
    )
    return res.find((x) => x != null)
  }),
).pipe(RequestResolver.contextFromEffect)

export const getProxyStorageSlot = ({ address, chainID }: { address: Address; chainID: number }) =>
  Effect.request(GetStorageSlot({ address, chainID }), GetStorageSlotResolver).pipe(Effect.withRequestCaching(true))
