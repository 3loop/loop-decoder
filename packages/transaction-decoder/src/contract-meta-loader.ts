import { Context, Effect, RequestResolver, Request, Array, Either, pipe, Schema, PrimaryKey, SchemaAST } from 'effect'
import { ContractData } from './types.js'
import { GetContractMetaStrategy } from './meta-strategy/request-model.js'
import { Address } from 'viem'

export interface ContractMetaParams {
  address: string
  chainID: number
}

interface ContractMetaSuccess {
  status: 'success'
  result: ContractData
}

interface ContractMetaNotFound {
  status: 'not-found'
  result: null
}

interface ContractMetaEmpty {
  status: 'empty'
  result: null
}

export type ContractMetaResult = ContractMetaSuccess | ContractMetaNotFound | ContractMetaEmpty

type ChainOrDefault = number | 'default'

export interface ContractMetaStore<Key = ContractMetaParams, Value = ContractMetaResult> {
  readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractMetaStrategy>[]>
  readonly set: (arg: Key, value: Value) => Effect.Effect<void, never>
  /**
   * The `get` function might return 3 states:
   * 1. `ContractMetaSuccess` - The contract metadata is found in the store
   * 2. `ContractMetaNotFound` - The contract metadata is found in the store, but is missing value
   * 3. `ContractMetaEmpty` - The contract metadata is not found in the store
   *
   *  We have state 2 to be able to skip the meta strategy in case we know that it's not available
   *  this can significantly reduce the number of requests to the strategies, and improve performance.
   *
   * Some strategies might be able to add the data later, because of that we encurage to store a timestamp
   * and remove the NotFound state to be able to check again.
   */
  readonly get: (arg: Key) => Effect.Effect<Value, never>
  readonly getMany?: (arg: Array<Key>) => Effect.Effect<Array<Value>, never>
}

export const ContractMetaStore = Context.GenericTag<ContractMetaStore>('@3loop-decoder/ContractMetaStore')

class SchemaContractData extends Schema.make<ContractData>(SchemaAST.objectKeyword) {}
class SchemaAddress extends Schema.make<Address>(SchemaAST.stringKeyword) {}

class ContractMetaLoader extends Schema.TaggedRequest<ContractMetaLoader>()('ContractMetaLoader', {
  failure: Schema.Never,
  success: Schema.NullOr(SchemaContractData),
  payload: {
    address: SchemaAddress,
    chainID: Schema.Number,
  },
}) {
  [PrimaryKey.symbol]() {
    return `contract-meta::${this.chainID}:${this.address}`
  }
}

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

const setValue = ({ chainID, address }: ContractMetaLoader, result: ContractData | null) =>
  Effect.gen(function* () {
    const { set } = yield* ContractMetaStore
    if (result == null) return
    // NOTE: Now when RPC fails if we store not-found it causes issues and not retries, for now we will just always retry
    yield* set(
      { chainID, address },
      result == null ? { status: 'not-found', result: null } : { status: 'success', result },
    )
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
          return resp.status === 'empty'
            ? Either.left(uniqueRequests[i])
            : Either.right([uniqueRequests[i], resp.result] as const)
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
      const strategyRequest = new GetContractMetaStrategy({
        address,
        chainID,
      })

      const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? [])

      // TODO: Distinct the errors and missing data, so we can retry on errors
      return Effect.validateFirst(allAvailableStrategies, (strategy) =>
        pipe(Effect.request(strategyRequest, strategy), Effect.withRequestCaching(true)),
      ).pipe(Effect.orElseSucceed(() => null))
    })

    // Store results and resolve pending requests
    yield* Effect.forEach(
      strategyResults,
      (result, i) => {
        const group = groups[makeKey(remaining[i])]

        return Effect.zipRight(
          setValue(remaining[i], result),
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
    Effect.request(new ContractMetaLoader({ chainID, address }), ContractMetaLoaderRequestResolver),
    'GetAndCacheContractMeta',
    { attributes: { chainID, address } },
  )
}
