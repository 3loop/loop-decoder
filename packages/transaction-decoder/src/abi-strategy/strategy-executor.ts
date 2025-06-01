import { Effect, Schedule, Duration, pipe } from 'effect'
import { GetContractABIStrategyParams, ContractAbiResolverStrategy } from '../abi-strategy/request-model.js'
import type { CircuitBreaker } from '../circuit-breaker/circuit-breaker.js'
import { RequestPool } from '../circuit-breaker/request-pool.js'
import * as Constants from '../circuit-breaker/constants.js'

export const make = (circuitBreaker: CircuitBreaker, requestPool: RequestPool) => {
  const executeStrategy = (strategy: ContractAbiResolverStrategy, params: GetContractABIStrategyParams) => {
    return pipe(
      strategy.resolver(params),
      Effect.timeout(Duration.decode(Constants.STRATEGY_TIMEOUT)),
      Effect.retry(
        Schedule.exponential(Duration.decode(Constants.INITIAL_RETRY_DELAY)).pipe(
          Schedule.compose(Schedule.recurs(Constants.DEFAULT_RETRY_TIMES)),
        ),
      ),
      (effect) => circuitBreaker.withCircuitBreaker(strategy.id, effect),
      (effect) => requestPool.withPoolManagement(params.chainId, effect),
      Effect.catchAll((error) => {
        // Log error but don't fail the entire operation
        return Effect.gen(function* () {
          yield* Effect.logWarning(`Strategy ${strategy.id} failed: ${JSON.stringify(error)}`)
          return yield* Effect.fail(error)
        })
      }),
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
        yield* Effect.logWarning(`No healthy strategies available for chain ${params.chainId}`)
        return null
      }

      // Try strategies one by one until one succeeds
      return yield* Effect.validateFirst(healthyStrategies, (strategy) => executeStrategy(strategy, params)).pipe(
        Effect.orElseSucceed(() => null),
      )
    })

  return {
    executeStrategiesSequentially,
  }
}
