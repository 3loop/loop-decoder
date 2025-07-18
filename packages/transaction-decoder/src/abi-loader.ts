import { Effect, Either, RequestResolver, Request, Array, pipe, Data, PrimaryKey, Schema, SchemaAST } from 'effect'
import { ContractABI } from './abi-strategy/request-model.js'
import { Abi } from 'viem'
import * as AbiStore from './abi-store.js'
import * as StrategyExecutorModule from './abi-strategy/strategy-executor.js'
import { SAFE_MULTISEND_SIGNATURE, SAFE_MULTISEND_ABI, AA_ABIS } from './decoding/constants.js'

interface LoadParameters {
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}
export class MissingABIError extends Data.TaggedError('DecodeError')<
  {
    message: string
  } & LoadParameters
> {
  constructor(props: LoadParameters) {
    super({ message: `Missing ABI`, ...props })
  }
}

export class EmptyCalldataError extends Data.TaggedError('DecodeError')<
  {
    message: string
  } & LoadParameters
> {
  constructor(props: LoadParameters) {
    super({ message: `Empty calldata`, ...props })
  }
}

class SchemaAbi extends Schema.make<Abi>(SchemaAST.objectKeyword) {}
class AbiLoader extends Schema.TaggedRequest<AbiLoader>()('AbiLoader', {
  failure: Schema.instanceOf(MissingABIError),
  success: SchemaAbi, // Abi
  payload: {
    chainID: Schema.Number,
    address: Schema.String,
    event: Schema.optional(Schema.String),
    signature: Schema.optional(Schema.String),
  },
}) {
  [PrimaryKey.symbol]() {
    return `abi::${this.chainID}:${this.address}:${this.event}:${this.signature}`
  }
}

function makeRequestKey(key: AbiLoader) {
  return `abi::${key.chainID}:${key.address}:${key.event}:${key.signature}`
}

const getMany = (requests: Array<AbiStore.AbiParams>) =>
  Effect.gen(function* () {
    const { getMany, get } = yield* AbiStore.AbiStore

    if (getMany != null) {
      return yield* getMany(requests)
    } else {
      return yield* Effect.all(
        requests.map(({ chainID, address, event, signature }) => get({ chainID, address, event, signature })),
        {
          concurrency: 'unbounded',
          batching: 'inherit',
        },
      )
    }
  })

const setValue = (key: AbiLoader, abi: ContractABI | null) =>
  Effect.gen(function* () {
    const { set } = yield* AbiStore.AbiStore
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
    return JSON.parse(abi.abi) as Abi
  }

  return JSON.parse(`[${abi.abi}]`) as Abi
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
 * **Circuit Breaking and Resilience**
 *
 * The AbiLoader now includes circuit breaking and intelligent concurrency management:
 * - Strategy-level circuit breakers prevent cascading failures
 * - Adaptive concurrency based on success rates and chain health
 * - Timeout protection for all external strategy calls
 * - Progressive degradation when strategies become unhealthy
 * - Request pooling with back-pressure handling
 */

export const AbiLoaderRequestResolver = RequestResolver.makeBatched((requests: Array<AbiLoader>) =>
  Effect.gen(function* () {
    if (requests.length === 0) return

    const { strategies, circuitBreaker, requestPool } = yield* AbiStore.AbiStore
    const strategyExecutor = StrategyExecutorModule.make(circuitBreaker, requestPool)

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
      ([request, abi]) => {
        const group = requestGroups[makeRequestKey(request)]
        const bestMatch = getBestMatch(abi)
        const result = bestMatch ? Effect.succeed(bestMatch) : Effect.fail(new MissingABIError(request))

        return Effect.forEach(group, (req) => Request.completeEffect(req, result), { discard: true })
      },
      {
        discard: true,
        concurrency: 'unbounded',
      },
    )

    // Get optimal concurrency for each chain
    const concurrencyMap = new Map<number, number>()
    for (const req of remaining) {
      if (!concurrencyMap.has(req.chainID)) {
        const optimalConcurrency = yield* requestPool.getOptimalConcurrency(req.chainID)
        concurrencyMap.set(req.chainID, optimalConcurrency)
      }
    }

    const concurrency = Math.min(...[...concurrencyMap.values(), 50]) // Use minimum concurrency across all chains, capped at 25

    yield* Effect.logDebug(`Executing ${remaining.length} remaining requests with concurrency ${concurrency}`)

    // NOTE: Firstly we batch strategies by address because in a transaction most of events and traces are from the same abi
    const response = yield* Effect.forEach(
      remaining,
      (req) => {
        const allAvailableStrategies = Array.prependAll(strategies.default, strategies[req.chainID] ?? []).filter(
          (strategy) => strategy.type === 'address',
        )

        return strategyExecutor
          .executeStrategiesSequentially(allAvailableStrategies, {
            address: req.address,
            chainId: req.chainID,
            strategyId: 'address-batch',
          })
          .pipe(
            Effect.tapError(Effect.logDebug),
            Effect.orElseSucceed(() => null),
            Effect.map((result) => (result ? Either.left(result) : Either.right(req))),
          )
      },
      {
        concurrency,
      },
    )

    const [addressStrategyResults, notFound] = Array.partitionMap(response, (res) => res)

    yield* Effect.logDebug(
      `Address strategies resolved ${addressStrategyResults.length} ABIs, ${notFound.length} not found`,
    )
    // NOTE: Secondly we request strategies to fetch fragments
    const fragmentStrategyResults = yield* Effect.forEach(
      notFound,
      ({ chainID, address, event, signature }) => {
        const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? []).filter(
          (strategy) => strategy.type === 'fragment',
        )

        return strategyExecutor
          .executeStrategiesSequentially(allAvailableStrategies, {
            address,
            chainId: chainID,
            event,
            signature,
            strategyId: 'fragment-batch',
          })
          .pipe(
            Effect.tapError(Effect.logDebug),
            Effect.orElseSucceed(() => null),
          ) // If no strategies found, return null
      },
      {
        concurrency,
        batching: true,
      },
    )

    const strategyResults = Array.appendAll(addressStrategyResults, fragmentStrategyResults)

    // Store results and resolve pending requests
    yield* Effect.forEach(
      strategyResults,
      (abis, i) => {
        const request = remaining[i]
        const abi = abis?.[0] ?? null
        const bestMatch = getBestMatch(abi)
        const result = bestMatch ? Effect.succeed(bestMatch) : Effect.fail(new MissingABIError(request))
        const group = requestGroups[makeRequestKey(request)]

        return Effect.zipRight(
          setValue(request, abi),
          Effect.forEach(group, (req) => Request.completeEffect(req, result), { discard: true }),
        )
      },
      {
        discard: true,
        concurrency: 'unbounded',
        batching: true,
      },
    )
  }),
).pipe(RequestResolver.contextFromServices(AbiStore.AbiStore), Effect.withRequestCaching(true))

// TODO: When failing to decode with one ABI, we should retry with other resolved ABIs
// We can decode with Effect.validateFirst(abis, (abi) => decodeMethod(input as Hex, abi)) and to find the first ABIs
// that decodes successfully. We might enforce a sorted array to prioritize the address match. We will have to think
// how to handle the strategy resolver in this case. Currently, we stop at first successful strategy, which might result
// in a missing Fragment. We treat this issue as a minor one for now, as we expect it to occur rarely on contracts that
// are not verified and with a non standard events structure.

export const getAndCacheAbi = (params: AbiStore.AbiParams) =>
  Effect.gen(function* () {
    if (params.event === '0x' || params.signature === '0x') {
      return yield* Effect.fail(new EmptyCalldataError(params))
    }

    if (params.signature && params.signature === SAFE_MULTISEND_SIGNATURE) {
      return yield* Effect.succeed(SAFE_MULTISEND_ABI)
    }

    if (params.signature && AA_ABIS[params.signature]) {
      return yield* Effect.succeed(AA_ABIS[params.signature])
    }

    return yield* Effect.request(new AbiLoader(params), AbiLoaderRequestResolver)
  }).pipe(
    Effect.withSpan('AbiLoader.GetAndCacheAbi', {
      attributes: {
        chainId: params.chainID,
        address: params.address,
        event: params.event,
        signature: params.signature,
      },
    }),
  )
