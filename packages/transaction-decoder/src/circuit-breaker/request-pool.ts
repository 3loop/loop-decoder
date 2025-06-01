import { Effect, Ref, Option, MetricLabel, Metric } from 'effect'

export interface RequestPoolConfig {
  readonly maxConcurrentRequests: number
  readonly adaptiveConcurrency: boolean
  readonly healthThreshold: number
  readonly concurrencyStep: number
  readonly metricLabels?: Iterable<MetricLabel.MetricLabel>
}

export interface RequestPoolState {
  readonly activeRequests: number
  readonly maxConcurrency: number
  readonly successRate: number
  readonly totalRequests: number
  readonly successfulRequests: number
}

export interface RequestPool {
  getOptimalConcurrency: (chainID: number) => Effect.Effect<number, never, never>
  withPoolManagement: <A, E>(chainID: number, effect: Effect.Effect<A, E, never>) => Effect.Effect<A, E, never>
  updateMetrics: (chainID: number, success: boolean) => Effect.Effect<void, never, never>
}

const defaultConfig: RequestPoolConfig = {
  maxConcurrentRequests: 50,
  adaptiveConcurrency: true,
  healthThreshold: 0.8, // 80% success rate
  concurrencyStep: 5,
}

const defaultState: RequestPoolState = {
  activeRequests: 0,
  maxConcurrency: 10, // Start conservative
  successRate: 1.0,
  totalRequests: 0,
  successfulRequests: 0,
}

export const make = (configParam: Partial<RequestPoolConfig> = {}): Effect.Effect<RequestPool, never, never> =>
  Effect.gen(function* () {
    const poolStates = yield* Ref.make(new Map<number, RequestPoolState>())
    const activeCounters = yield* Ref.make(new Map<number, number>())
    const config: RequestPoolConfig = {
      ...defaultConfig,
      ...configParam,
    }

    // Setup metrics if provided
    const metrics = Option.fromNullable(config.metricLabels).pipe(Option.map(makeRequestPoolMetrics))

    const getState = (chainID: number): Effect.Effect<RequestPoolState, never, never> =>
      Ref.get(poolStates).pipe(Effect.map((map) => map.get(chainID) ?? defaultState))

    const updateState = (chainID: number, newState: RequestPoolState) =>
      Ref.update(poolStates, (map) => new Map(map).set(chainID, newState))

    const incrementActive = (chainID: number) =>
      Effect.gen(function* () {
        yield* Ref.update(activeCounters, (map) => {
          const current = map.get(chainID) ?? 0
          return new Map(map).set(chainID, current + 1)
        })

        // Update active requests metric
        const activeCount = yield* Ref.get(activeCounters).pipe(Effect.map((map) => map.get(chainID) ?? 0))
        yield* withRequestPoolMetrics(metrics, (m) => Metric.set(m.activeRequests, activeCount))
      })

    const decrementActive = (chainID: number) =>
      Effect.gen(function* () {
        yield* Ref.update(activeCounters, (map) => {
          const current = map.get(chainID) ?? 0
          return new Map(map).set(chainID, Math.max(0, current - 1))
        })

        // Update active requests metric
        const activeCount = yield* Ref.get(activeCounters).pipe(Effect.map((map) => map.get(chainID) ?? 0))
        yield* withRequestPoolMetrics(metrics, (m) => Metric.set(m.activeRequests, activeCount))
      })

    const calculateOptimalConcurrency = (state: RequestPoolState): number => {
      if (!config.adaptiveConcurrency) {
        return Math.min(config.maxConcurrentRequests, state.maxConcurrency)
      }

      const { successRate, maxConcurrency } = state

      if (successRate >= config.healthThreshold) {
        // High success rate: can increase concurrency
        const newConcurrency = Math.min(config.maxConcurrentRequests, maxConcurrency + config.concurrencyStep)
        return newConcurrency
      } else if (successRate < config.healthThreshold * 0.7) {
        // Low success rate: decrease concurrency
        const newConcurrency = Math.max(1, maxConcurrency - config.concurrencyStep)
        return newConcurrency
      }

      // Moderate success rate: maintain current concurrency
      return maxConcurrency
    }

    const determinePoolState = (
      successRate: number,
      activeRequests: number,
      maxConcurrency: number,
    ): 'healthy' | 'degraded' | 'overloaded' => {
      if (activeRequests >= maxConcurrency * 0.9) {
        return 'overloaded'
      } else if (successRate < config.healthThreshold * 0.7) {
        return 'degraded'
      } else {
        return 'healthy'
      }
    }

    const getOptimalConcurrency = (chainID: number): Effect.Effect<number, never, never> =>
      Effect.gen(function* () {
        const state = yield* getState(chainID)
        const optimalConcurrency = calculateOptimalConcurrency(state)

        // Update the max concurrency in state if it changed
        if (optimalConcurrency !== state.maxConcurrency) {
          yield* updateState(chainID, {
            ...state,
            maxConcurrency: optimalConcurrency,
          })

          // Track concurrency adjustment in metrics
          yield* withRequestPoolMetrics(metrics, (m) =>
            Effect.all([
              Metric.increment(m.concurrencyAdjustments),
              Metric.set(m.maxConcurrency, optimalConcurrency),
            ]).pipe(Effect.asVoid),
          )
        }

        return optimalConcurrency
      })

    const withPoolManagement = <A, E>(
      chainID: number,
      effect: Effect.Effect<A, E, never>,
    ): Effect.Effect<A, E, never> =>
      Effect.gen(function* () {
        yield* incrementActive(chainID)

        const result = yield* effect.pipe(
          Effect.tap(() => updateMetrics(chainID, true)),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* updateMetrics(chainID, false)
              return yield* Effect.fail(error)
            }),
          ),
          Effect.ensuring(decrementActive(chainID)),
        )

        return result
      })

    const updateMetrics = (chainID: number, success: boolean): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        const state = yield* getState(chainID)
        const newTotalRequests = state.totalRequests + 1
        const newSuccessfulRequests = state.successfulRequests + (success ? 1 : 0)

        // Use sliding window to prevent metrics from becoming stale
        const windowSize = 100
        const effectiveTotalRequests = Math.min(newTotalRequests, windowSize)
        const effectiveSuccessfulRequests = Math.min(newSuccessfulRequests, windowSize)
        const effectiveSuccessRate = effectiveSuccessfulRequests / effectiveTotalRequests

        yield* updateState(chainID, {
          ...state,
          totalRequests: effectiveTotalRequests,
          successfulRequests: effectiveSuccessfulRequests,
          successRate: effectiveSuccessRate,
        })

        // Update metrics
        yield* withRequestPoolMetrics(metrics, (m: RequestPoolMetrics) =>
          Effect.gen(function* () {
            if (success) {
              yield* Metric.increment(m.successfulRequests)
            } else {
              yield* Metric.increment(m.failedRequests)
            }
            yield* Metric.set(m.successRate, effectiveSuccessRate)

            // Determine and update pool state
            const activeCount = yield* Ref.get(activeCounters).pipe(Effect.map((map) => map.get(chainID) ?? 0))
            const poolState = determinePoolState(effectiveSuccessRate, activeCount, state.maxConcurrency)
            yield* Metric.set(m.poolState, poolStateToCode(poolState))
          }),
        )
      })

    return {
      getOptimalConcurrency,
      withPoolManagement,
      updateMetrics,
    }
  })

/**
 * Metrics tracking for request pool operations
 */
export class RequestPoolMetrics {
  constructor(
    readonly activeRequests: Metric.Metric.Gauge<number>,
    readonly maxConcurrency: Metric.Metric.Gauge<number>,
    readonly successfulRequests: Metric.Metric.Counter<number>,
    readonly failedRequests: Metric.Metric.Counter<number>,
    readonly concurrencyAdjustments: Metric.Metric.Counter<number>,
    readonly successRate: Metric.Metric.Gauge<number>,
    readonly poolState: Metric.Metric.Gauge<number>,
  ) {}
}

/**
 * Pool state codes for metrics
 */
export const poolStateToCode = (state: 'healthy' | 'degraded' | 'overloaded'): number => {
  switch (state) {
    case 'healthy':
      return 0
    case 'degraded':
      return 1
    case 'overloaded':
      return 2
  }
}

/**
 * Creates metrics for request pool with the given labels
 */
export const makeRequestPoolMetrics = (labels: Iterable<MetricLabel.MetricLabel>) => {
  const activeRequests = Metric.gauge('effect_request_pool_active_requests').pipe(Metric.taggedWithLabels(labels))
  const maxConcurrency = Metric.gauge('effect_request_pool_max_concurrency').pipe(Metric.taggedWithLabels(labels))
  const successfulRequests = Metric.counter('effect_request_pool_successful_requests').pipe(
    Metric.taggedWithLabels(labels),
  )
  const failedRequests = Metric.counter('effect_request_pool_failed_requests').pipe(Metric.taggedWithLabels(labels))
  const concurrencyAdjustments = Metric.counter('effect_request_pool_concurrency_adjustments').pipe(
    Metric.taggedWithLabels(labels),
  )
  const successRate = Metric.gauge('effect_request_pool_success_rate').pipe(Metric.taggedWithLabels(labels))
  const poolState = Metric.gauge('effect_request_pool_state').pipe(Metric.taggedWithLabels(labels))

  return new RequestPoolMetrics(
    activeRequests,
    maxConcurrency,
    successfulRequests,
    failedRequests,
    concurrencyAdjustments,
    successRate,
    poolState,
  )
}

/**
 * Helper function to conditionally update metrics
 */
export const withRequestPoolMetrics = (
  metrics: Option.Option<RequestPoolMetrics>,
  f: (metrics: RequestPoolMetrics) => Effect.Effect<void>,
): Effect.Effect<void> => {
  return Effect.ignore(Effect.flatMap(metrics, f))
}
