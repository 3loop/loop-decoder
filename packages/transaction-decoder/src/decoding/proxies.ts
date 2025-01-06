import { Effect, PrimaryKey, Request, RequestResolver, Schedule, Schema, SchemaAST } from 'effect'

import { PublicClient, RPCCallError, RPCFetchError } from '../public-client.js'
import { Address, Hex } from 'viem'
import { ProxyType } from '../types.js'
import { ZERO_ADDRESS } from './constants.js'

interface StorageSlot {
  type: ProxyType
  slot: Hex
}

interface ProxyResult {
  type: ProxyType
  address: Address
}

const storageSlots: StorageSlot[] = [
  { type: 'eip1967', slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' }, //EIP1967
  { type: 'zeppelin', slot: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3' }, //zeppelin
  { type: 'safe', slot: '0xa619486e00000000000000000000000000000000000000000000000000000000' }, // gnosis Safe Proxy Factor 1.1.1
]

const zeroSlot = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface GetProxy extends Request.Request<ProxyResult | undefined, RPCFetchError> {
  readonly _tag: 'GetProxy'
  readonly address: Address
  readonly chainID: number
}

export const GetProxy = Request.tagged<GetProxy>('GetProxy')
class SchemaAddress extends Schema.make<Address>(SchemaAST.stringKeyword) {}
class SchemaProxy extends Schema.make<ProxyResult | undefined>(SchemaAST.objectKeyword) {}

class ProxyLoader extends Schema.TaggedRequest<ProxyLoader>()('ProxyLoader', {
  failure: Schema.instanceOf(RPCFetchError),
  success: Schema.NullOr(SchemaProxy),
  payload: {
    address: SchemaAddress,
    chainID: Schema.Number,
  },
}) {
  [PrimaryKey.symbol]() {
    return `proxy::${this.chainID}:${this.address}`
  }
}

const getStorageSlot = (request: ProxyLoader, slot: StorageSlot) =>
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

const ethCall = (request: ProxyLoader, slot: StorageSlot) =>
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
      catch: () => new RPCCallError('Eth call'),
    })
  })

export const GetProxyResolver = RequestResolver.fromEffect(
  (request: ProxyLoader): Effect.Effect<ProxyResult | undefined, RPCFetchError, PublicClient> =>
    Effect.gen(function* () {
      // NOTE: Should we make this recursive when we have a Proxy of a Proxy?

      const effects = storageSlots.map((slot) =>
        Effect.gen(function* () {
          const res: ProxyResult | undefined = { type: slot.type, address: '0x' }

          let address: Hex | undefined
          switch (slot.type) {
            case 'eip1967':
            case 'zeppelin': {
              address = yield* getStorageSlot(request, slot)
              break
            }
            case 'safe': {
              address = yield* ethCall(request, slot).pipe(Effect.orElseSucceed(() => undefined))
              break
            }
          }

          if (!address || address === zeroSlot) return undefined

          res.address = ('0x' + address.slice(address.length - 40)) as Address
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

export const getProxyImplementation = ({ address, chainID }: { address: Address; chainID: number }) => {
  if (address === ZERO_ADDRESS) return Effect.succeed(null)

  return Effect.request(new ProxyLoader({ address, chainID }), GetProxyResolver).pipe(Effect.withRequestCaching(true))
}
