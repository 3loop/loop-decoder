import { Effect, Either, PrimaryKey, Request, RequestResolver, Schema, SchemaAST } from 'effect'
import { PublicClient, RPCFetchError, UnknownNetwork } from '../public-client.js'
import { Address, getAddress, Hex } from 'viem'
import { ProxyType } from '../types.js'
import { ZERO_ADDRESS } from './constants.js'
import { whatsabi } from '@shazow/whatsabi'

interface StorageSlot {
  type: ProxyType
  slot: Hex
}

interface ProxyResult extends StorageSlot {
  address: Address
}

const knownStorageSlots: StorageSlot[] = [
  { type: 'eip1167', slot: '0x' }, //EIP1167 minimal proxy
  { type: 'eip1967', slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' }, //EIP1967
  { type: 'zeppelin', slot: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3' }, //zeppelin
  { type: 'safe', slot: '0xa619486e00000000000000000000000000000000000000000000000000000000' }, // gnosis Safe Proxy Factor 1.1.1
]

const zeroSlot = '0x0000000000000000000000000000000000000000000000000000000000000000'

export interface GetProxy extends Request.Request<ProxyResult | undefined, RPCFetchError | UnknownNetwork> {
  readonly _tag: 'GetProxy'
  readonly address: Address
  readonly chainID: number
}

export const GetProxy = Request.tagged<GetProxy>('GetProxy')
class SchemaAddress extends Schema.make<Address>(SchemaAST.stringKeyword) {}
class SchemaProxy extends Schema.make<ProxyResult | undefined>(SchemaAST.objectKeyword) {}

class ProxyLoader extends Schema.TaggedRequest<ProxyLoader>()('ProxyLoader', {
  failure: Schema.Union(Schema.instanceOf(RPCFetchError), Schema.instanceOf(UnknownNetwork)),
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
      catch: (e) => {
        return new RPCFetchError(`Get storage error: ${(e as { details?: string }).details ?? ''}`)
      },
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
      catch: (e) => new RPCFetchError(`Eth call error: ${(e as { details?: string }).details ?? ''}`),
    })
  })

const ethGetCode = (request: ProxyLoader) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client: publicClient } = yield* service.getPublicClient(request.chainID)
    return yield* Effect.tryPromise({
      try: () => publicClient.getCode({ address: request.address }),
      catch: (e) => new RPCFetchError(`Eth get code error: ${(e as { details?: string }).details ?? ''}`),
    })
  })

const getProxyTypeFromBytecode = (request: ProxyLoader, code: Hex) =>
  Effect.gen(function* () {
    const service = yield* PublicClient
    const { client: publicClient } = yield* service.getPublicClient(request.chainID)

    //use whatsabi to only resolve proxies with a known bytecode
    const cachedCodeProvider = whatsabi.providers.WithCachedCode(publicClient, {
      [request.address]: code,
    })

    const result = yield* Effect.tryPromise({
      try: () =>
        whatsabi.autoload(request.address, {
          provider: cachedCodeProvider,
          abiLoader: false, // Skip ABI loaders
          signatureLookup: false, // Skip looking up selector signatures
        }),
      catch: () => new RPCFetchError('Get proxy type from bytecode'),
    })

    //if there are soeme proxies, return the list of them but with udpdated types
    if (result && result.proxies.length > 0) {
      const proxies: (ProxyResult | StorageSlot)[] = result.proxies
        .map((proxy) => {
          if (proxy.name === 'EIP1967Proxy') {
            return knownStorageSlots.find((slot) => slot.type === 'eip1967')
          }

          if (proxy.name === 'GnosisSafeProxy') {
            return knownStorageSlots.find((slot) => slot.type === 'safe')
          }

          if (proxy.name === 'ZeppelinOSProxy') {
            return knownStorageSlots.find((slot) => slot.type === 'zeppelin')
          }

          if (proxy.name === 'FixedProxy') {
            const implementation = (proxy as any as { resolvedAddress: Address }).resolvedAddress

            if (!implementation) return undefined

            return {
              type: 'eip1167',
              address: getAddress(implementation),
              slot: '0x',
            } as ProxyResult
          }

          return undefined
        })
        .filter(Boolean)
        .filter((proxy, index, self) => self.findIndex((p) => p?.type === proxy.type) === index)

      return proxies
    }

    return undefined
  })

export const GetProxyResolver = RequestResolver.fromEffect(
  (request: ProxyLoader): Effect.Effect<ProxyResult | undefined, RPCFetchError | UnknownNetwork, PublicClient> =>
    Effect.gen(function* () {
      // NOTE: Should we make this recursive when we have a Proxy of a Proxy?

      //Getting the bytecode of the address first
      const codeResult = yield* ethGetCode(request).pipe(Effect.either)

      if (Either.isLeft(codeResult)) {
        yield* Effect.logError(`ProxyResolver error: ${JSON.stringify(codeResult.left)}`)
        return undefined
      }

      const code = codeResult.right

      //If code is empty and it is EOA, return empty result
      if (!code) return undefined

      let proxySlots: StorageSlot[] | undefined

      //Getting the proxies list from the bytecode
      const proxies = yield* getProxyTypeFromBytecode(request, code)
      if (proxies && proxies.length > 0) {
        //If it is EIP1167 proxy, return it becasue it is alredy resolved from the bytecode
        if (proxies.some((proxy) => proxy.type === 'eip1167')) {
          return proxies.find((proxy) => proxy.type === 'eip1167') as ProxyResult
        }

        proxySlots = proxies as StorageSlot[]
      }

      if (!proxySlots) {
        return undefined
      }

      //get the implementation address by requesting the storage slot value of possible proxies
      const effects = (proxySlots ?? knownStorageSlots).map((slot) =>
        Effect.gen(function* () {
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

          return {
            type: slot.type,
            address: ('0x' + address.slice(address.length - 40)) as Address,
            slot: slot.slot,
          }
        }),
      )

      const res = yield* Effect.all(effects, {
        concurrency: 'inherit',
        batching: 'inherit',
        mode: 'either',
      })

      const resRight = res
        .filter(Either.isRight)
        .map((r) => r.right)
        .find((x) => x != null)

      const resLeft = res.filter(Either.isLeft).map((r) => r.left)

      if (resLeft.length > 0) {
        yield* Effect.logError(`ProxyResolver error: ${resLeft.map((e) => JSON.stringify(e)).join(', ')}`)
      }

      return resRight
    }),
).pipe(RequestResolver.contextFromEffect)

export const getProxyImplementation = ({ address, chainID }: { address: Address; chainID: number }) => {
  if (address === ZERO_ADDRESS) return Effect.succeed(null)

  return Effect.request(new ProxyLoader({ address, chainID }), GetProxyResolver).pipe(Effect.withRequestCaching(true))
}
