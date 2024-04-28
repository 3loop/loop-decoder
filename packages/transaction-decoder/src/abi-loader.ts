import { Context, Effect, Either, RequestResolver, Request, Array, pipe } from 'effect'
import { ContractABI, GetContractABIStrategy } from './abi-strategy/request-model.js'

export interface GetAbiParams {
  chainID: number
  address: string
  event?: string | undefined
  signature?: string | undefined
}

type ChainOrDefault = number | 'default'

export interface AbiStore<Key = GetAbiParams, SetValue = ContractABI, Value = string | null> {
  readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractABIStrategy>[]>
  readonly set: (value: SetValue) => Effect.Effect<void, never>
  readonly get: (arg: Key) => Effect.Effect<Value, never>
  readonly getMany?: (arg: Array<Key>) => Effect.Effect<Array<Value>, never>
}

export const AbiStore = Context.GenericTag<AbiStore>('@3loop-decoder/AbiStore')

export interface AbiLoader extends Request.Request<string | null, unknown> {
  _tag: 'AbiLoader'
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}

const AbiLoader = Request.tagged<AbiLoader>('AbiLoader')

function makeKey(key: AbiLoader) {
  return `abi::${key.chainID}:${key.address}:${key.event}:${key.signature}`
}

const getMany = (requests: Array<GetAbiParams>) =>
  Effect.gen(function* () {
    const { getMany, get } = yield* AbiStore

    if (getMany != null) {
      return yield* getMany(requests)
    } else {
      return yield* Effect.all(
        requests.map(({ chainID, address, event, signature }) => get({ chainID, address, event, signature })),
        {
          concurrency: 'inherit',
          batching: 'inherit',
        },
      )
    }
  })

const setOnValue = (abi: ContractABI | null) =>
  Effect.gen(function* () {
    const { set } = yield* AbiStore
    // NOTE: Now we ignore the null value, but we might want to store it to avoid pinging the same strategy again?
    if (abi) yield* set(abi)
  })

const getBestMatch = (abi: ContractABI | null, request: AbiLoader) => {
  if (abi == null) return null

  const { address, event, signature } = request

  let result: string | null = null

  const addressmatch = abi.address?.[address]
  if (addressmatch != null) {
    result = addressmatch
  }

  const funcmatch = signature ? abi.func?.[signature] : null
  if (result == null && funcmatch != null) {
    result = `[${funcmatch}]`
  }

  const eventmatch = event ? abi.event?.[event] : null
  if (result == null && eventmatch != null) {
    result = `[${eventmatch}]`
  }

  return result
}

/**
 * Data loader for contracts abi
 *
 * The AbiLoader is responsible for resolving contracts ABI. The loader loads the ABI
 * for one Event or Function signature at a time. Because the same signature can result
 * in multiple ABIs, the loader will prioritize fetching the ABI for the address first.
 *
 * We first attempt to load the metadata from the store. If the metadata is not found in
 * the store, it falls back to user provided strategies for loading the metadata
 * from external sources.
 *
 * **Strategies for Loading ABI**
 *
 * Users can provide external strategies that will be used to load the ABI
 * from external sources. The strategies are executed sequentially until one of
 * them resolves successfully. The Strategies are also implemented as
 * Effect Requests. When a strategy resolves successfully, the result is stored in the store.
 *
 * Strategies are grouped by chainID, and a default scope. The default scope is intended
 * for the APIs that are chain agnostic, such as 4byte.directory, while the chainID are API's
 * that store verified ABIs for example Etherscan.
 *
 * **Request Deduplication**
 *
 * When decoding a transaction we will have multiple concurrent requests of the
 * same function/event as we decode each trace and log in parallel.
 *
 * To optimize concurrent requests, the AbiLoader uses the RequestResolver
 * to batch and cache requests. However, out-of-the-box, the RequestResolver does not
 * perform request deduplication. To address this, we implement request deduplication
 * inside the resolver's body. We use the `makeKey` function to generate a unique key
 * for each request and group them by that key. We then load the ABI for the unique
 * requests and resolve the pending requests in a group with the same result.
 *
 * Further improvements can be made by extra grouping by address, to avoid extra
 * requests for each signature.
 */
const AbiLoaderRequestResolver = RequestResolver.makeBatched((requests: Array<AbiLoader>) =>
  Effect.gen(function* () {
    if (requests.length === 0) return

    const { strategies } = yield* AbiStore
    // NOTE: We can further optimize if we have match by Address by avoid extra requests for each signature
    // but might need to update the Loader public API
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

    //  Resolve ABI from the store
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

    // Load the ABI from the strategies
    const strategyResults = yield* Effect.forEach(remaining, ({ chainID, address, event, signature }) => {
      const strategyRequest = GetContractABIStrategy({
        address,
        event,
        signature,
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
      (abi, i) => {
        const request = remaining[i]
        const result = getBestMatch(abi, request)

        const group = groups[makeKey(request)]

        return Effect.zipRight(
          setOnValue(abi),
          Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true }),
        )
      },
      { discard: true },
    )
  }),
).pipe(RequestResolver.contextFromServices(AbiStore), Effect.withRequestCaching(true))

export const getAndCacheAbi = (params: GetAbiParams) => {
  if (params.event === '0x' || params.signature === '0x') {
    return Effect.succeed(null)
  }
  return Effect.request(AbiLoader(params), AbiLoaderRequestResolver)
}
