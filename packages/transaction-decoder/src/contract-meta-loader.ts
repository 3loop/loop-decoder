import { Context, Effect, RequestResolver, Request, ReadonlyArray, Either } from 'effect'
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
  readonly getMany?: (arg: ReadonlyArray<Key>) => Effect.Effect<ReadonlyArray<Value | null>, never>
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

const ContractMetaLoaderRequestResolver = RequestResolver.makeBatched((requests: Array<ContractMetaLoader>) =>
  Effect.gen(function* (_) {
    const contractMetaStore = yield* _(ContractMetaStore)
    const strategies = contractMetaStore.strategies

    const groups = ReadonlyArray.groupBy(requests, makeKey)
    const uniqueRequests = Object.values(groups).map((group) => group[0])

    const getMany = (requests: ReadonlyArray<ContractMetaLoader>) => {
      if (contractMetaStore.getMany != null) {
        return contractMetaStore.getMany(requests)
      } else {
        return Effect.all(
          requests.map(({ chainID, address }) => contractMetaStore.get({ chainID, address })),
          {
            concurrency: 'inherit',
            batching: 'inherit',
          },
        )
      }
    }

    const set = ({ chainID, address }: ContractMetaLoader, result: ContractData | null) => {
      return result ? contractMetaStore.set({ chainID, address }, result) : Effect.succeed(null)
    }

    const [remaining, results] = yield* _(
      getMany(uniqueRequests),
      Effect.map(
        ReadonlyArray.partitionMap((resp, i) => {
          return resp == null ? Either.left(uniqueRequests[i]) : Either.right([uniqueRequests[i], resp] as const)
        }),
      ),
      Effect.orElseSucceed(() => [uniqueRequests, []] as const),
    )

    // Resolve ContractMeta from the store
    yield* _(
      Effect.forEach(
        results,
        ([request, result]) => {
          const group = groups[makeKey(request)]
          return Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true })
        },
        {
          discard: true,
        },
      ),
    )

    // Resolve ContractMeta from the strategies
    yield* _(
      Effect.forEach(remaining, ({ chainID, address }) => {
        const strategyRequest = GetContractMetaStrategy({
          address,
          chainID,
        })
        const allAvailableStrategies = [...(strategies[chainID] ?? []), ...strategies.default]

        return Effect.validateFirst(allAvailableStrategies, (strategy) =>
          Effect.request(strategyRequest, strategy),
        ).pipe(Effect.orElseSucceed(() => null))
      }),
      Effect.flatMap((results) =>
        Effect.forEach(
          results,
          (result, i) => {
            const group = groups[makeKey(remaining[i])]

            return Effect.zipRight(
              set(remaining[i], result),
              Effect.forEach(group, (req) => Request.succeed(req, result), { discard: true }),
            )
          },
          { discard: true },
        ),
      ),
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
  return Effect.request(ContractMetaLoader({ chainID, address }), ContractMetaLoaderRequestResolver)
}
