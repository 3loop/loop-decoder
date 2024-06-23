import { Context, Effect, RequestResolver, Request, Array, Either, pipe } from 'effect'
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
  readonly set: (arg: Key, value: Value) => Effect.Effect<void, never>
  readonly get: (arg: Key) => Effect.Effect<Value | null, never>
  readonly getMany?: (arg: Array<Key>) => Effect.Effect<Array<Value | null>, never>
}

export const ContractMetaStore = Context.GenericTag<ContractMetaStore>('@3loop-decoder/ContractMetaStore')

export interface ContractMetaLoader extends Request.Request<ContractData | null, unknown> {
  _tag: 'ContractMetaLoader'
  address: Address
  chainID: number
}

const ContractMetaLoader = Request.tagged<ContractMetaLoader>('ContractMetaLoader')

function makeKey(key: ContractMetaLoader) {
  return `contract-meta::${key.chainID}:${key.address}`
}

const getMany = (requests: Array<ContractMetaLoader>) =>
  Effect.gen(function* () {
    const { getMany, get } = yield* ContractMetaStore

    if (getMany != null) {
      return yield* getMany(requests)
    } else {
      return yield* Effect.all(
        requests.map(({ chainID, address }) => get({ chainID, address })),
        {
          concurrency: 'inherit',
          batching: 'inherit',
        },
      )
    }
  })

const setOnValue = ({ chainID, address }: ContractMetaLoader, result: ContractData | null) =>
  Effect.gen(function* () {
    const { set } = yield* ContractMetaStore
    if (result) yield* set({ chainID, address }, result)
  })

/**
 * Data loader for contract metadata
 *
 * The ContractMetaLoader is responsible for resolving contract metadata. It first
 * attempts to load the metadata from the store. If the metadata is not found in
 * the store, it falls back to user provided strategies for loading the metadata
 * from external sources.
 *
 * **Strategies for Loading Metadata**
 *
 * Users can provide external strategies that will be used to load metadata
 * from external sources. The strategies are executed sequentially until one of
 * them resolves successfully. The Strategies are also implemented as
 * Effect Requests. When a strategy resolves successfully, the result is stored in the store.
 *
 * **Request Deduplication**
 *
 * When decoding a transaction we will have multiple concurrent requests of the
 * same contract as we decode each trace and log in parallel.
 *
 * To optimize concurrent requests, the ContractMetaLoader uses the RequestResolver
 * to batch and cache requests. However, out-of-the-box, the RequestResolver does not
 * perform request deduplication. To address this, we implement request deduplication
 * inside the resolver's body. We use the `makeKey` function to generate a unique key
 * for each request and group them by that key. We then load the metadata for the unique
 * requests and resolve the pending requests in a group with the same result
 */
const ContractMetaLoaderRequestResolver = RequestResolver.makeBatched((requests: Array<ContractMetaLoader>) =>
  Effect.gen(function* () {
    const { strategies } = yield* ContractMetaStore

    const groups = Array.groupBy(requests, makeKey)
    const uniqueRequests = Object.values(groups).map((group) => group[0])

    const [remaining, results] = yield* pipe(
      getMany(uniqueRequests),
      Effect.map(
        Array.partitionMap((resp, i) => {
          return resp == null ? Either.left(uniqueRequests[i]) : Either.right([uniqueRequests[i], resp] as const)
        }),
      ),
      Effect.orElseSucceed(() => [uniqueRequests, []] as const),
    )

    // Resolve ContractMeta from the store
    yield* Effect.forEach(
      results,
      ([request, result]) => {
        const group = groups[makeKey(request)]
        return Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true })
      },
      {
        discard: true,
      },
    )

    // Fetch ContractMeta from the strategies
    const strategyResults = yield* Effect.forEach(remaining, ({ chainID, address }) => {
      const strategyRequest = GetContractMetaStrategy({
        address,
        chainID,
      })

      const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? [])

      return Effect.validateFirst(allAvailableStrategies, (strategy) => Effect.request(strategyRequest, strategy)).pipe(
        Effect.orElseSucceed(() => null),
      )
    })

    // Store results and resolve pending requests
    yield* Effect.forEach(
      strategyResults,
      (result, i) => {
        const group = groups[makeKey(remaining[i])]

        return Effect.zipRight(
          setOnValue(remaining[i], result),
          Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true }),
        )
      },
      { discard: true },
    )
  }),
).pipe(RequestResolver.contextFromServices(ContractMetaStore), Effect.withRequestCaching(true))

export const getAndCacheContractMeta = ({
  chainID,
  address,
}: {
  readonly chainID: number
  readonly address: Address
}) => {
  return Effect.withSpan(
    Effect.request(ContractMetaLoader({ chainID, address }), ContractMetaLoaderRequestResolver),
    'GetAndCacheContractMeta',
    { attributes: { chainID, address } },
  )
}
