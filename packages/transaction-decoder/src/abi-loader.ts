import { Context, Effect, Either, RequestResolver, Request, Array, pipe } from 'effect'
import { ContractABI, ContractAbiResolverStrategy, GetContractABIStrategy } from './abi-strategy/request-model.js'

const STRATEGY_TIMEOUT = 5000
export interface AbiParams {
  chainID: number
  address: string
  event?: string | undefined
  signature?: string | undefined
}

export interface ContractAbiSuccess {
  status: 'success'
  result: ContractABI
}

export interface ContractAbiNotFound {
  status: 'not-found'
  result: null
}

export interface ContractAbiEmpty {
  status: 'empty'
  result: null
}

export type ContractAbiResult = ContractAbiSuccess | ContractAbiNotFound | ContractAbiEmpty

type ChainOrDefault = number | 'default'
export interface AbiStore<Key = AbiParams, Value = ContractAbiResult> {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: Key, value: Value) => Effect.Effect<void, never>
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

function makeRequestKey(key: AbiLoader) {
  return `abi::${key.chainID}:${key.address}:${key.event}:${key.signature}`
}

const getMany = (requests: Array<AbiParams>) =>
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

const setValue = (key: AbiLoader, abi: ContractABI | null) =>
  Effect.gen(function* () {
    const { set } = yield* AbiStore
    yield* set(
      {
        chainID: key.chainID,
        address: key.address,
        event: key.event,
        signature: key.signature,
      },
      abi == null ? { status: 'not-found', result: null } : { status: 'success', result: abi },
    )
  })

const getBestMatch = (abi: ContractABI | null) => {
  if (abi == null) return null

  if (abi.type === 'address') {
    return abi.abi
  }

  return `[${abi.abi}]`
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
 * inside the resolver's body. We use the `makeRequestKey` function to generate a unique key
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

    const requestGroups = Array.groupBy(requests, makeRequestKey)
    const uniqueRequests = Object.values(requestGroups).map((group) => group[0])

    const [remaining, cachedResults] = yield* pipe(
      getMany(uniqueRequests),
      Effect.map(
        Array.partitionMap((resp, i) => {
          return resp.status === 'empty'
            ? Either.left(uniqueRequests[i])
            : Either.right([uniqueRequests[i], resp.result] as const)
        }),
      ),
      Effect.orElseSucceed(() => [uniqueRequests, []] as const),
    )

    //  Resolve ABI from the store
    yield* Effect.forEach(
      cachedResults,
      ([request, result]) => {
        const group = requestGroups[makeRequestKey(request)]
        const abi = result?.abi ?? null
        return Effect.forEach(group, (req) => Request.succeed(req, abi), { discard: true })
      },
      {
        discard: true,
      },
    )

    // NOTE: Firstly we batch strategies by address because in a transaction most of events and traces are from the same abi
    const response = yield* Effect.forEach(remaining, (req) => {
      const strategyRequest = GetContractABIStrategy({
        address: req.address,
        chainID: req.chainID,
      })

      const allAvailableStrategies = Array.prependAll(strategies.default, strategies[req.chainID] ?? []).filter(
        (strategy) => strategy.type === 'address',
      )

      return Effect.validateFirst(allAvailableStrategies, (strategy) =>
        pipe(
          Effect.request(strategyRequest, strategy.resolver),
          Effect.withRequestCaching(true),
          Effect.timeout(STRATEGY_TIMEOUT),
        ),
      ).pipe(
        Effect.map(Either.left),
        Effect.orElseSucceed(() => Either.right(req)),
      )
    })

    const [addressStrategyResults, notFound] = Array.partitionMap(response, (res) => res)

    // NOTE: Secondly we request strategies to fetch fragments
    const fragmentStrategyResults = yield* Effect.forEach(notFound, ({ chainID, address, event, signature }) => {
      const strategyRequest = GetContractABIStrategy({
        address,
        chainID,
        event,
        signature,
      })

      const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? []).filter(
        (strategy) => strategy.type === 'fragment',
      )

      // TODO: Distinct the errors and missing data, so we can retry on errors
      return Effect.validateFirst(allAvailableStrategies, (strategy) =>
        pipe(
          Effect.request(strategyRequest, strategy.resolver),
          Effect.withRequestCaching(true),
          Effect.timeout(STRATEGY_TIMEOUT),
        ),
      ).pipe(Effect.orElseSucceed(() => null))
    })

    const strategyResults = Array.appendAll(addressStrategyResults, fragmentStrategyResults)

    // Store results and resolve pending requests
    yield* Effect.forEach(
      strategyResults,
      (abi, i) => {
        const request = remaining[i]
        const result = getBestMatch(abi)

        const group = requestGroups[makeRequestKey(request)]

        return Effect.zipRight(
          setValue(request, abi),
          Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true }),
        )
      },
      { discard: true },
    )
  }),
).pipe(RequestResolver.contextFromServices(AbiStore), Effect.withRequestCaching(true))

// TODO: When failing to decode with one ABI, we should retry with other resolved ABIs
export const getAndCacheAbi = (params: AbiParams) => {
  if (params.event === '0x' || params.signature === '0x') {
    return Effect.succeed(null)
  }
  return Effect.withSpan(Effect.request(AbiLoader(params), AbiLoaderRequestResolver), 'AbiLoader.GetAndCacheAbi', {
    attributes: {
      chainID: params.chainID,
      address: params.address,
      event: params.event,
      signature: params.signature,
    },
  })
}
