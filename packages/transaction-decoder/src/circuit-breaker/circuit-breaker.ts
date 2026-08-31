import {
  Effect,
  Ref,
  Duration,
  Clock,
  Predicate,
  Schedule,
  Metric,
  MetricLabel,
  Option,
  PubSub,
  Stream,
  Either,
} from 'effect'

/**
 * @since 1.0.0
 * @category symbols
 */
export const CircuitBreakerTypeId: unique symbol = Symbol.for('CircuitBreaker')

/**
 * @since 1.0.0
 * @category symbols
 */
export type CircuitBreakerTypeId = typeof CircuitBreakerTypeId

class CircuitBreakerMetrics {
  constructor(
    readonly state: Metric.Metric.Gauge<number>,
    readonly stateChanges: Metric.Metric.Counter<number>,
    readonly successfulCalls: Metric.Metric.Counter<number>,
    readonly failedCalls: Metric.Metric.Counter<number>,
    readonly rejectedCalls: Metric.Metric.Counter<number>,
  ) {}
}

/** State change event with timestamp for observability */
class StateChange {
  constructor(
    readonly from: CircuitBreaker.State,
    readonly to: CircuitBreaker.State,
    readonly atNanos: bigint,
  ) {}
}

/**
 * @since 1.0.0
 */
export declare namespace CircuitBreaker {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface OpenError {
    readonly _tag: 'OpenError'
    readonly strategyId: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type State = 'Open' | 'Closed' | 'HalfOpen'

  /**
   * @since 1.0.0
   * @category models
   */
  export interface CircuitBreakerState {
    readonly failures: number
    readonly lastFailureTime: number
    readonly state: State
    readonly halfOpenCalls: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface TrippingStrategy {
    readonly shouldTrip: (successful: boolean) => Effect.Effect<boolean, never, never>
    readonly onReset: Effect.Effect<void, never, never>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FailureRateOptions {
    /**
     * Minimum number of calls before failure rate calculation kicks in.
     */
    readonly minThroughput?: number
    /**
     * Number of buckets to track for failure rate calculation.
     */
    readonly sampleBuckets?: number
    /**
     * Duration of each sample bucket.
     */
    readonly sampleDuration?: Duration.DurationInput
    /**
     * Failure rate threshold (0.0 to 1.0).
     */
    readonly threshold?: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Config<E = unknown> {
    /**
     * The maximum number of failures that can occur before the CircuitBreaker trips.
     */
    readonly maxFailures?: number
    /**
     * The reset timeout duration.
     */
    readonly resetTimeout?: Duration.Duration
    /**
     * Maximum calls allowed in half-open state.
     */
    readonly halfOpenMaxCalls?: number
    /**
     * The tripping strategy to use.
     */
    readonly strategy?: Effect.Effect<TrippingStrategy, never, never>
    /**
     * The reset policy schedule.
     */
    readonly resetPolicy?: Schedule.Schedule<Duration.Duration, void, void>
    /**
     * Only failures that match according to isFailure are treated as failures.
     */
    readonly isFailure?: Predicate.Predicate<E> | undefined
    /**
     * Labels for metrics collection.
     */
    readonly metricLabels?: Iterable<MetricLabel.MetricLabel>
    /**
     * Callback for state change notifications.
     */
    readonly onStateChange?: (change: StateChange) => Effect.Effect<void>
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CircuitBreaker<in E = unknown> {
  readonly [CircuitBreakerTypeId]: CircuitBreakerTypeId
  /**
   * Executes the specified effect with the circuit breaker.
   */
  readonly withCircuitBreaker: <A, E2 extends E, R>(
    strategyId: string,
    effect: Effect.Effect<A, E2, R>,
  ) => Effect.Effect<A, E2 | CircuitBreaker.OpenError, R>
  /**
   * Returns the current state of the CircuitBreaker for a strategy.
   */
  readonly currentState: (strategyId: string) => Effect.Effect<CircuitBreaker.State, never, never>
  /**
   * Checks if a strategy is healthy.
   */
  readonly isHealthy: (strategyId: string) => Effect.Effect<boolean, never, never>
  /**
   * Returns a stream of state changes for observability.
   */
  readonly stateChanges: Stream.Stream<StateChange, never, never>
}

/**
 * Represents the error that will be returned by calls to a CircuitBreaker in the Open state.
 *
 * @since 1.0.0
 * @category constructors
 */
export const OpenError = (strategyId: string): CircuitBreaker.OpenError => ({
  _tag: 'OpenError',
  strategyId,
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const isCircuitBreakerOpenError = (u: unknown): u is CircuitBreaker.OpenError =>
  typeof u === 'object' && u != null && '_tag' in u && u._tag === 'OpenError'

const defaultState: CircuitBreaker.CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'Closed',
  halfOpenCalls: 0,
}

const defaultConfig: CircuitBreaker.Config = {
  maxFailures: 5,
  resetTimeout: Duration.seconds(60),
  halfOpenMaxCalls: 3,
}

/**
 * Creates a failure count tripping strategy.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failureCount = (maxFailures: number): Effect.Effect<CircuitBreaker.TrippingStrategy, never, never> =>
  Ref.make(0).pipe(
    Effect.map((ref) => ({
      shouldTrip: (successful: boolean) =>
        successful ? Ref.set(ref, 0).pipe(Effect.as(false)) : Ref.modify(ref, (n) => [n + 1 === maxFailures, n + 1]),
      onReset: Ref.set(ref, 0),
    })),
  )

/**
 * Creates a simple failure rate tripping strategy.
 * Tracks success/failure ratio over a sliding window.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failureRate = ({
  threshold = 0.5,
  minCalls = 10,
  windowSize = 20,
}: {
  /**
   * Failure rate threshold (0.0 to 1.0). Circuit trips when failure rate exceeds this.
   * @default 0.5
   */
  readonly threshold?: number
  /**
   * Minimum number of calls before failure rate is evaluated.
   * @default 10
   */
  readonly minCalls?: number
  /**
   * Size of the sliding window for tracking calls.
   * @default 20
   */
  readonly windowSize?: number
} = {}): Effect.Effect<CircuitBreaker.TrippingStrategy, never, never> =>
  Effect.gen(function* () {
    // Validate inputs
    if (threshold < 0 || threshold > 1) {
      return yield* Effect.die('threshold must be between 0 and 1')
    }
    if (minCalls < 1) {
      return yield* Effect.die('minCalls must be at least 1')
    }
    if (windowSize < minCalls) {
      return yield* Effect.die('windowSize must be at least minCalls')
    }

    // Track calls in a sliding window (true = success, false = failure)
    const window = yield* Ref.make<Array<boolean>>([])

    return {
      shouldTrip: (successful: boolean) =>
        Ref.modify(window, (calls) => {
          // Add new call to window
          const newCalls = [...calls, successful]

          // Keep only the most recent windowSize calls
          const trimmedCalls = newCalls.length > windowSize ? newCalls.slice(-windowSize) : newCalls

          // Only evaluate failure rate if we have enough calls
          if (trimmedCalls.length < minCalls) {
            return [false, trimmedCalls]
          }

          // Calculate failure rate
          const failures = trimmedCalls.filter((call) => !call).length
          const failureRate = failures / trimmedCalls.length

          return [failureRate >= threshold, trimmedCalls]
        }),
      onReset: Ref.set(window, []),
    }
  })

/**
 * Creates a new CircuitBreaker.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <E = unknown>(
  config: Partial<CircuitBreaker.Config<E>> = {},
): Effect.Effect<CircuitBreaker<E>, never, never> =>
  Effect.gen(function* () {
    const finalConfig = { ...defaultConfig, ...config }
    const states = yield* Ref.make(new Map<string, CircuitBreaker.CircuitBreakerState>())

    // Create a PubSub for state change notifications
    const stateChangesPubSub = yield* PubSub.unbounded<StateChange>()

    // Setup metrics if provided
    const metrics = Option.fromNullable(finalConfig.metricLabels).pipe(Option.map(makeMetrics))

    function withMetrics(f: (metrics: CircuitBreakerMetrics) => Effect.Effect<void>): Effect.Effect<void> {
      return Effect.ignore(Effect.flatMap(metrics, f))
    }

    const notifyStateChange = (from: CircuitBreaker.State, to: CircuitBreaker.State): Effect.Effect<void> =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeNanos
        const stateChange = new StateChange(from, to, now)

        // Publish to the stream
        yield* PubSub.publish(stateChangesPubSub, stateChange)

        // Call the user-provided callback if present
        if (finalConfig.onStateChange) {
          yield* finalConfig.onStateChange(stateChange)
        }
      })

    const getState = (strategyId: string): Effect.Effect<CircuitBreaker.CircuitBreakerState, never, never> =>
      Ref.get(states).pipe(Effect.map((map) => map.get(strategyId) ?? defaultState))

    // Create tripping strategy if provided, otherwise use default failure count
    const trippingStrategy = finalConfig.strategy
      ? yield* finalConfig.strategy
      : yield* failureCount(finalConfig.maxFailures ?? 5)

    type Admission = 'Allowed' | 'Rejected' | 'HalfOpened'

    const tryAdmit = (strategyId: string, now: number): Effect.Effect<Admission, never, never> =>
      Ref.modify(states, (map): [Admission, Map<string, CircuitBreaker.CircuitBreakerState>] => {
        const state = map.get(strategyId) ?? defaultState

        switch (state.state) {
          case 'Closed':
            return ['Allowed', map]
          case 'HalfOpen':
            if (state.halfOpenCalls >= (finalConfig.halfOpenMaxCalls ?? 3)) {
              return ['Rejected', map]
            }

            return [
              'Allowed',
              new Map(map).set(strategyId, {
                ...state,
                halfOpenCalls: state.halfOpenCalls + 1,
              }),
            ]
          case 'Open':
            if (now - state.lastFailureTime < Duration.toMillis(finalConfig.resetTimeout ?? Duration.seconds(60))) {
              return ['Rejected', map]
            }

            return [
              'HalfOpened',
              new Map(map).set(strategyId, {
                ...state,
                state: 'HalfOpen',
                halfOpenCalls: 1,
              }),
            ]
        }
      })

    const onSuccess = (strategyId: string) =>
      Effect.gen(function* () {
        yield* trippingStrategy.shouldTrip(true)

        const closedCircuit = yield* Ref.modify(
          states,
          (map): [boolean, Map<string, CircuitBreaker.CircuitBreakerState>] => {
            const state = map.get(strategyId) ?? defaultState

            if (state.state === 'HalfOpen') {
              return [
                true,
                new Map(map).set(strategyId, {
                  ...defaultState,
                  state: 'Closed',
                }),
              ]
            }

            if (state.failures > 0) {
              return [
                false,
                new Map(map).set(strategyId, {
                  ...state,
                  failures: 0,
                }),
              ]
            }

            return [false, map]
          },
        )

        if (closedCircuit) {
          // Reset to closed state after successful half-open calls
          yield* trippingStrategy.onReset
          yield* notifyStateChange('HalfOpen', 'Closed')
          yield* withMetrics((metrics) =>
            Metric.increment(metrics.stateChanges).pipe(
              Effect.zipRight(Metric.set(metrics.state, stateToCode('Closed'))),
            ),
          )
        }
      })

    const onFailure = (strategyId: string) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        const shouldTrip = yield* trippingStrategy.shouldTrip(false)

        const openedFrom = yield* Ref.modify(
          states,
          (map): [CircuitBreaker.State | undefined, Map<string, CircuitBreaker.CircuitBreakerState>] => {
            const state = map.get(strategyId) ?? defaultState

            if (state.state === 'HalfOpen') {
              return [
                'HalfOpen',
                new Map(map).set(strategyId, {
                  ...state,
                  state: 'Open',
                  failures: state.failures + 1,
                  lastFailureTime: now,
                  halfOpenCalls: 0,
                }),
              ]
            }

            if (shouldTrip && state.state === 'Closed') {
              return [
                'Closed',
                new Map(map).set(strategyId, {
                  ...state,
                  state: 'Open',
                  failures: state.failures + 1,
                  lastFailureTime: now,
                }),
              ]
            }

            return [
              undefined,
              new Map(map).set(strategyId, {
                ...state,
                failures: state.failures + 1,
                lastFailureTime: now,
              }),
            ]
          },
        )

        if (openedFrom !== undefined) {
          yield* notifyStateChange(openedFrom, 'Open')
          yield* withMetrics((metrics) =>
            Metric.increment(metrics.stateChanges).pipe(
              Effect.zipRight(Metric.set(metrics.state, stateToCode('Open'))),
            ),
          )
        }
      })

    const withCircuitBreaker = <A, E2 extends E, R>(
      strategyId: string,
      effect: Effect.Effect<A, E2, R>,
    ): Effect.Effect<A, E2 | CircuitBreaker.OpenError, R> =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        const admission = yield* tryAdmit(strategyId, now)

        if (admission === 'Rejected') {
          yield* withMetrics((metrics) => Metric.increment(metrics.rejectedCalls))
          return yield* Effect.fail(OpenError(strategyId))
        }

        if (admission === 'HalfOpened') {
          yield* notifyStateChange('Open', 'HalfOpen')
          yield* withMetrics((metrics) =>
            Metric.increment(metrics.stateChanges).pipe(
              Effect.zipRight(Metric.set(metrics.state, stateToCode('HalfOpen'))),
            ),
          )
        }

        const result = yield* Effect.either(effect)

        if (Either.isRight(result)) {
          yield* onSuccess(strategyId)
          yield* withMetrics((metrics) => Metric.increment(metrics.successfulCalls))
          return result.right
        } else {
          // Check if this failure should be counted based on the isFailure predicate
          const shouldCountFailure = finalConfig.isFailure ? finalConfig.isFailure(result.left) : true

          if (shouldCountFailure) {
            yield* onFailure(strategyId)
            yield* withMetrics((metrics) => Metric.increment(metrics.failedCalls))
          }

          return yield* Effect.fail(result.left)
        }
      })
    const currentState = (strategyId: string): Effect.Effect<CircuitBreaker.State, never, never> =>
      getState(strategyId).pipe(Effect.map((state) => state.state))

    const isHealthy = (strategyId: string): Effect.Effect<boolean, never, never> =>
      getState(strategyId).pipe(Effect.map((state) => state.state === 'Closed' || state.state === 'HalfOpen'))

    return {
      [CircuitBreakerTypeId]: CircuitBreakerTypeId,
      withCircuitBreaker,
      currentState,
      isHealthy,
      stateChanges: Stream.fromPubSub(stateChangesPubSub),
    } as const
  })

// =============================================================================
// Metrics
// =============================================================================

const stateToCode = (state: CircuitBreaker.State): number => {
  switch (state) {
    case 'Closed':
      return 0
    case 'HalfOpen':
      return 1
    case 'Open':
      return 2
  }
}

const makeMetrics = (labels: Iterable<MetricLabel.MetricLabel>) => {
  const state = Metric.gauge('effect_circuit_breaker_state').pipe(Metric.taggedWithLabels(labels))
  const stateChanges = Metric.counter('effect_circuit_breaker_state_changes').pipe(Metric.taggedWithLabels(labels))
  const successfulCalls = Metric.counter('effect_circuit_breaker_successful_calls').pipe(
    Metric.taggedWithLabels(labels),
  )
  const failedCalls = Metric.counter('effect_circuit_breaker_failed_calls').pipe(Metric.taggedWithLabels(labels))
  const rejectedCalls = Metric.counter('effect_circuit_breaker_rejected_calls').pipe(Metric.taggedWithLabels(labels))
  return new CircuitBreakerMetrics(state, stateChanges, successfulCalls, failedCalls, rejectedCalls)
}
