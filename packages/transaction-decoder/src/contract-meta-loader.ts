import { Effect, RequestResolver, Request, Array, Either, pipe, Schema, PrimaryKey, SchemaAST } from 'effect'
import { ContractData } from './types.js'
import { GetContractMetaStrategy } from './meta-strategy/request-model.js'
import { Address } from 'viem'
import { ZERO_ADDRESS } from './decoding/constants.js'
import * as ContractMetaStore from './contract-meta-store.js'

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
    const { getMany, get } = yield* ContractMetaStore.ContractMetaStore

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
    const { set } = yield* ContractMetaStore.ContractMetaStore
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
    const { strategies } = yield* ContractMetaStore.ContractMetaStore

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
    const strategyResults = yield* Effect.forEach(
      remaining,
      ({ chainID, address }) => {
        const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? [])

        // TODO: Distinct the errors and missing data, so we can retry on errors
        return Effect.validateFirst(allAvailableStrategies, (strategy) =>
          pipe(
            Effect.request(
              new GetContractMetaStrategy({
                address,
                chainId: chainID,
                strategyId: strategy.id,
              }),
              strategy.resolver,
            ),
            Effect.withRequestCaching(true),
          ),
        ).pipe(Effect.orElseSucceed(() => null))
      },
      { concurrency: 'unbounded', batching: true },
    )

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
).pipe(RequestResolver.contextFromServices(ContractMetaStore.ContractMetaStore), Effect.withRequestCaching(true))

export const getAndCacheContractMeta = ({
  chainID,
  address,
}: {
  readonly chainID: number
  readonly address: Address
}) => {
  if (address === ZERO_ADDRESS) return Effect.succeed(null)

  return Effect.withSpan(
    Effect.request(new ContractMetaLoader({ chainID, address }), ContractMetaLoaderRequestResolver),
    'GetAndCacheContractMeta',
    { attributes: { chainID, address } },
  )
}
