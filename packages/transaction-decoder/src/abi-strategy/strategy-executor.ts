import { Effect, Schedule, Duration, pipe, Data } from 'effect'
import { GetContractABIStrategyParams, ContractAbiResolverStrategy, MissingABIStrategyError } from './request-model.js'
import type { CircuitBreaker } from '../circuit-breaker/circuit-breaker.js'
import { RequestPool } from '../circuit-breaker/request-pool.js'
import * as Constants from '../circuit-breaker/constants.js'

export class MissingHealthyStrategy extends Data.TaggedError('MissingHealthyStrategy')<{
  chainId: number
  strategies: string[]
}> {
  constructor(params: { chainId: number; strategies: string[] }) {
    super(params)
  }
}

export const make = (circuitBreaker: CircuitBreaker, requestPool: RequestPool) => {
  const executeStrategy = (strategy: ContractAbiResolverStrategy, params: GetContractABIStrategyParams) => {
    return pipe(
      strategy.resolver(params),
      Effect.timeout(Duration.decode(Constants.STRATEGY_TIMEOUT)),
      Effect.catchTag('MissingABIStrategyError', (error) => {
        // Log error but don't fail the entire operation
        return Effect.gen(function* () {
          yield* Effect.logDebug(`Strategy ${strategy.id} found no ABI: ${error.message}`)
          return yield* Effect.succeed(error)
        })
      }),
      Effect.retry(
        Schedule.exponential(Duration.decode(Constants.INITIAL_RETRY_DELAY)).pipe(
          Schedule.compose(Schedule.recurs(Constants.DEFAULT_RETRY_TIMES)),
        ),
      ),
      (effect) => circuitBreaker.withCircuitBreaker(strategy.id, effect),
      (effect) => requestPool.withPoolManagement(params.chainId, effect),
      Effect.flatMap((data) => (data instanceof MissingABIStrategyError ? Effect.fail(data) : Effect.succeed(data))),
    )
  }

  const executeStrategiesSequentially = (
    strategies: ContractAbiResolverStrategy[],
    params: GetContractABIStrategyParams,
  ) =>
    Effect.gen(function* () {
      // Filter out unhealthy strategies first
      const healthyStrategies: ContractAbiResolverStrategy[] = []

      for (const strategy of strategies) {
        const isHealthy = yield* circuitBreaker.isHealthy(strategy.id)
        if (isHealthy) {
          healthyStrategies.push(strategy)
        } else {
          yield* Effect.logDebug(`Skipping unhealthy strategy: ${strategy.id}`)
        }
      }

      if (healthyStrategies.length === 0) {
        return yield* Effect.fail(
          new MissingHealthyStrategy({
            chainId: params.chainId,
            strategies: strategies.map((s) => s.id),
          }),
        )
      }

      // Try strategies one by one until one succeeds
      return yield* Effect.validateFirst(healthyStrategies, (strategy) => executeStrategy(strategy, params))
    })

  return {
    executeStrategiesSequentially,
  }
}
