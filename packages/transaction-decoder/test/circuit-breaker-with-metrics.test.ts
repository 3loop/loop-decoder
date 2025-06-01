import { describe, it, expect } from 'vitest'
import { Effect, MetricLabel, Duration, Either, TestContext } from 'effect'
import * as CircuitBreaker from '../src/circuit-breaker/circuit-breaker.js'

describe('CircuitBreaker with Metrics', () => {
  const createCircuitBreakerWithMetrics = () => {
    const metricLabels = [
      MetricLabel.make('service', 'test-api'),
      MetricLabel.make('version', '1.0'),
      MetricLabel.make('environment', 'test'),
    ]

    return CircuitBreaker.make<Error>({
      maxFailures: 3,
      resetTimeout: Duration.seconds(2), // Shorter timeout for tests
      halfOpenMaxCalls: 2,
      metricLabels,
      isFailure: (error) => error.name !== 'TimeoutError',
    })
  }

  const mockApiCall = (shouldFail: boolean): Effect.Effect<string, Error, never> =>
    shouldFail ? Effect.fail(new Error('API call failed')) : Effect.succeed('API response')

  it('should create circuit breaker with metrics configuration', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      // Verify circuit breaker is created and functional
      const state = yield* circuitBreaker.currentState('test-strategy')
      expect(state).toBe('Closed') // Initial state should be closed

      const isHealthy = yield* circuitBreaker.isHealthy('test-strategy')
      expect(isHealthy).toBe(true)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should track successful calls and maintain closed state', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      // Make successful calls
      for (let i = 0; i < 5; i++) {
        const result = yield* circuitBreaker.withCircuitBreaker('success-test', mockApiCall(false))
        expect(result).toBe('API response')
      }

      // Circuit should remain closed and healthy
      const state = yield* circuitBreaker.currentState('success-test')
      expect(state).toBe('Closed')

      const isHealthy = yield* circuitBreaker.isHealthy('success-test')
      expect(isHealthy).toBe(true)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should open circuit after max failures and track metrics', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      // Make calls that fail to trip the circuit (maxFailures = 3)
      for (let i = 0; i < 4; i++) {
        const result = yield* Effect.either(circuitBreaker.withCircuitBreaker('failure-test', mockApiCall(true)))
        expect(Either.isLeft(result)).toBe(true)
      }

      // Circuit should now be open
      const state = yield* circuitBreaker.currentState('failure-test')
      expect(state).toBe('Open')

      const isHealthy = yield* circuitBreaker.isHealthy('failure-test')
      expect(isHealthy).toBe(false)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should reject calls when circuit is open', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      // Trip the circuit by making it fail
      for (let i = 0; i < 4; i++) {
        yield* Effect.either(circuitBreaker.withCircuitBreaker('rejection-test', mockApiCall(true)))
      }

      // Now try to make a call when circuit is open - should be rejected
      const result = yield* Effect.either(
        circuitBreaker.withCircuitBreaker(
          'rejection-test',
          mockApiCall(false), // This would succeed, but circuit is open
        ),
      )

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(CircuitBreaker.isCircuitBreakerOpenError(result.left)).toBe(true)
      }

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should handle TimeoutError differently based on isFailure configuration', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      // TimeoutError should not count as failure due to isFailure config
      for (let i = 0; i < 5; i++) {
        const result = yield* Effect.either(
          circuitBreaker.withCircuitBreaker('timeout-test', Effect.fail(timeoutError)),
        )
        expect(Either.isLeft(result)).toBe(true)
      }

      // Circuit should still be closed since TimeoutErrors don't count as failures
      const state = yield* circuitBreaker.currentState('timeout-test')
      expect(state).toBe('Closed')

      const isHealthy = yield* circuitBreaker.isHealthy('timeout-test')
      expect(isHealthy).toBe(true)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should work with multiple strategy IDs independently', async () => {
    const testEffect = Effect.gen(function* () {
      const circuitBreaker = yield* createCircuitBreakerWithMetrics()

      // Trip circuit for strategy1 but not strategy2
      for (let i = 0; i < 4; i++) {
        yield* Effect.either(circuitBreaker.withCircuitBreaker('strategy1', mockApiCall(true)))
      }

      // Make successful calls to strategy2
      for (let i = 0; i < 3; i++) {
        const result = yield* circuitBreaker.withCircuitBreaker('strategy2', mockApiCall(false))
        expect(result).toBe('API response')
      }

      // Check states - strategy1 should be open, strategy2 should be closed
      const state1 = yield* circuitBreaker.currentState('strategy1')
      const state2 = yield* circuitBreaker.currentState('strategy2')

      expect(state1).toBe('Open')
      expect(state2).toBe('Closed')

      const isHealthy1 = yield* circuitBreaker.isHealthy('strategy1')
      const isHealthy2 = yield* circuitBreaker.isHealthy('strategy2')

      expect(isHealthy1).toBe(false)
      expect(isHealthy2).toBe(true)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })
})
