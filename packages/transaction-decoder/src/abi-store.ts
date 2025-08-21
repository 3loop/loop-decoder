import { Context, Effect, RateLimiter, Function, Layer, MetricLabel } from 'effect'
import { ContractABI, ContractAbiResolverStrategy, GetContractABIStrategyParams } from './abi-strategy/request-model.js'
import * as CircuitBreaker from './circuit-breaker/circuit-breaker.js'
import * as RequestPool from './circuit-breaker/request-pool.js'
export interface AbiParams {
  chainID: number
  address: string
  event?: string | undefined
  signature?: string | undefined
}

export type CachedContractABIStatus = 'success' | 'invalid' | 'not-found'

export type CachedContractABI = ContractABI & {
  id: string
  source?: string
  status: CachedContractABIStatus
  timestamp?: string
}

export type CacheContractABIParam = ContractABI & {
  source?: string
  status: CachedContractABIStatus
  timestamp?: string
}

export type ContractAbiResult = CachedContractABI[]

type ChainOrDefault = number | 'default'

export interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: AbiParams, value: CacheContractABIParam) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>
  readonly updateStatus?: (
    id: string | number,
    status: 'success' | 'invalid' | 'not-found',
  ) => Effect.Effect<void, never>
  readonly circuitBreaker: CircuitBreaker.CircuitBreaker<unknown>
  readonly requestPool: RequestPool.RequestPool
}

export const AbiStore = Context.GenericTag<AbiStore>('@3loop-decoder/AbiStore')

export const make = ({
  strategies: strategiesWithoutRateLimit,
  ...rest
}: Omit<AbiStore, 'circuitBreaker' | 'requestPool'>) =>
  Effect.gen(function* () {
    const strategies = yield* Effect.reduce(
      Object.entries(strategiesWithoutRateLimit),
      {} as Record<ChainOrDefault, ContractAbiResolverStrategy[]>,
      (acc, [chainID, specific]) =>
        Effect.gen(function* () {
          const all = yield* Effect.forEach(specific, (strategy) =>
            Effect.gen(function* () {
              const rateLimit = strategy.rateLimit ? yield* RateLimiter.make(strategy.rateLimit) : Function.identity

              return yield* Effect.succeed({
                ...strategy,
                resolver: (params: GetContractABIStrategyParams) => strategy.resolver(params).pipe(rateLimit),
              })
            }),
          )

          return {
            ...acc,
            [chainID]: all,
          }
        }),
    )

    const circuitBreaker = yield* CircuitBreaker.make({
      metricLabels: [MetricLabel.make('service', 'abi-loader')],
    })

    const requestPool = yield* RequestPool.make({ metricLabels: [MetricLabel.make('service', 'abi-loader')] })

    return {
      strategies,
      circuitBreaker,
      requestPool,
      ...rest,
    }
  })

export const layer = (args: Omit<AbiStore, 'circuitBreaker' | 'requestPool'>) => Layer.scoped(AbiStore, make(args))
