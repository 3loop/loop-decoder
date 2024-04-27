import { Context, Effect, Either, RequestResolver, Request, Array, Console } from 'effect'
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

const AbiLoaderRequestResolver = RequestResolver.makeBatched((requests: Array<AbiLoader>) =>
  Effect.gen(function* () {
    if (requests.length === 0) return

    const abiStore = yield* AbiStore
    // NOTE: We can further optimize if we have match by Address by avoid extra requests for each signature
    // but might need to update the Loader public API
    const groups = Array.groupBy(requests, makeKey)
    const uniqueRequests = Object.values(groups).map((group) => group[0])

    const getMany = (requests: Array<GetAbiParams>) => {
      if (abiStore.getMany != null) {
        return abiStore.getMany(requests)
      } else {
        return Effect.all(
          requests.map(({ chainID, address, event, signature }) =>
            abiStore.get({ chainID, address, event, signature }),
          ),
          {
            concurrency: 'inherit',
            batching: 'inherit',
          },
        )
      }
    }

    const set = (abi: ContractABI | null) => {
      // NOTE: Now we ignore the null value, but we might want to store it to avoid pinging the same strategy again?
      return abi ? abiStore.set(abi) : Effect.succeed(null)
    }

    const [remaining, results] = yield* getMany(uniqueRequests).pipe(
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

    const strategies = abiStore.strategies

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
        const { address, event, signature } = request

        let result: string | null = null

        const addressmatch = abi?.address?.[address]
        if (addressmatch != null) {
          result = addressmatch
        }

        const funcmatch = signature ? abi?.func?.[signature] : null
        if (result == null && funcmatch != null) {
          result = `[${funcmatch}]`
        }

        const eventmatch = event ? abi?.event?.[event] : null
        if (result == null && eventmatch != null) {
          result = `[${eventmatch}]`
        }

        const group = groups[makeKey(request)]

        return Effect.zipRight(
          set(abi),
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
