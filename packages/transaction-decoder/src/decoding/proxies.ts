import { Effect, Request, RequestResolver, Schedule } from 'effect'
import { PublicClient, RPCCallError, RPCFetchError, UnknownNetwork } from '../public-client.js'
import { Address, Hex } from 'viem'
import { ProxyType } from '../types.js'

interface StorageSlot {
  type: ProxyType
  slot: Hex
}

const storageSlots: StorageSlot[] = [
  { type: 'eip1967', slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' }, //eipEIP1967
  { type: 'zeppelin', slot: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3' }, //zeppelin
  { type: 'gnosis', slot: '0xa619486e00000000000000000000000000000000000000000000000000000000' }, // gnosis Safe Proxy Factor 1.1.1
]

const zeroSlot = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface GetStorageSlot
  extends Request.Request<{ type: ProxyType; address: Address } | undefined, UnknownNetwork> {
  readonly _tag: 'GetStorageSlot'
  readonly address: Address
  readonly chainID: number
}

const getStorageSlot = (request: GetStorageSlot, slot: StorageSlot) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client: publicClient } = yield* service.getPublicClient(request.chainID)
    return yield* Effect.tryPromise({
      try: () =>
        publicClient.getStorageAt({
          address: request.address,
          slot: slot.slot,
        }),
      catch: () => new RPCFetchError('Get storage'),
    })
  })

const ethCall = (request: GetStorageSlot, slot: StorageSlot) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client: publicClient } = yield* service.getPublicClient(request.chainID)
    return yield* Effect.tryPromise({
      try: async () =>
        (
          await publicClient.call({
            to: request.address,
            data: slot.slot,
          })
        )?.data,
      catch: () => new RPCCallError('Get storage'),
    })
  })

export const GetStorageSlot = Request.tagged<GetStorageSlot>('GetStorageSlot')

export const GetStorageSlotResolver = RequestResolver.fromEffect((request: GetStorageSlot) =>
  Effect.gen(function* () {
    // NOTE: Should we make this recursive when we have a Proxy of a Proxy?
    const effects = storageSlots.map((slot) =>
      Effect.gen(function* () {
        const res: { type: ProxyType; address: Hex } | undefined = { type: slot.type, address: '0x' }

        let addressString: Address | undefined
        switch (slot.type) {
          case 'eip1967':
          case 'zeppelin': {
            addressString = yield* getStorageSlot(request, slot)
            break
          }
          case 'gnosis': {
            addressString = yield* ethCall(request, slot).pipe(Effect.orElseSucceed(() => undefined))
            break
          }
        }

        if (addressString == null || addressString === zeroSlot) return undefined

        res.address = ('0x' + addressString.slice(addressString.length - 40)) as Address

        return res
      }),
    )

    const policy = Schedule.addDelay(
      Schedule.recurs(2), // Retry for a maximum of 2 times
      () => '100 millis', // Add a delay of 100 milliseconds between retries
    )
    const res = yield* Effect.all(effects, {
      concurrency: 'inherit',
      batching: 'inherit',
    }).pipe(Effect.retryOrElse(policy, () => Effect.succeed(undefined)))

    return res?.find((x) => x != null)
  }),
).pipe(RequestResolver.contextFromEffect)

export const getProxyStorageSlot = ({ address, chainID }: { address: Address; chainID: number }) =>
  Effect.request(GetStorageSlot({ address, chainID }), GetStorageSlotResolver).pipe(Effect.withRequestCaching(true))
