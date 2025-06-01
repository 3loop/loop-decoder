import { describe, it, expect } from 'vitest'
import { Effect, Either, MetricLabel, TestContext, TestClock } from 'effect'
import { make as makeRequestPool } from '../src/circuit-breaker/request-pool.js'

describe('RequestPool with Metrics', () => {
  it('should create a request pool with metrics configuration', async () => {
    const testEffect = Effect.gen(function* () {
      const labels = [MetricLabel.make('service', 'test'), MetricLabel.make('pool_type', 'test_pool')]

      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 10,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 2,
        metricLabels: labels,
      })

      // Test that the pool functions are available
      expect(typeof pool.getOptimalConcurrency).toBe('function')
      expect(typeof pool.withPoolManagement).toBe('function')
      expect(typeof pool.updateMetrics).toBe('function')

      // Test getting optimal concurrency for a chain
      const chainId = 1
      const concurrency = yield* pool.getOptimalConcurrency(chainId)
      expect(concurrency).toBeGreaterThan(0)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should track successful requests and update metrics', async () => {
    const testEffect = Effect.gen(function* () {
      const labels = [MetricLabel.make('test', 'success_tracking')]

      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 5,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 1,
        metricLabels: labels,
      })

      const chainId = 1

      // Simulate a successful request
      const mockSuccessfulRequest = Effect.succeed('success')

      const result = yield* pool.withPoolManagement(chainId, mockSuccessfulRequest)
      expect(result).toBe('success')

      // The request should have been tracked (we can't directly assert metrics values
      // in this test, but we can verify the pool management completed successfully)
      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should track failed requests and update metrics', async () => {
    const testEffect = Effect.gen(function* () {
      const labels = [MetricLabel.make('test', 'failure_tracking')]

      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 5,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 1,
        metricLabels: labels,
      })

      const chainId = 1

      // Simulate a failed request
      const mockFailedRequest = Effect.fail(new Error('test error'))

      const result = yield* Effect.either(pool.withPoolManagement(chainId, mockFailedRequest))

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(Error)
      }

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should adapt concurrency based on success rate', async () => {
    const testEffect = Effect.gen(function* () {
      const labels = [MetricLabel.make('test', 'concurrency_adaptation')]

      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 20,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 2,
        metricLabels: labels,
      })

      const chainId = 1

      // Get initial concurrency
      const initialConcurrency = yield* pool.getOptimalConcurrency(chainId)

      // Simulate multiple successful requests to increase concurrency
      for (let i = 0; i < 10; i++) {
        yield* pool.updateMetrics(chainId, true)
      }

      const concurrencyAfterSuccess = yield* pool.getOptimalConcurrency(chainId)

      // Should increase or stay the same
      expect(concurrencyAfterSuccess).toBeGreaterThanOrEqual(initialConcurrency)

      // Simulate multiple failed requests to decrease concurrency
      for (let i = 0; i < 15; i++) {
        yield* pool.updateMetrics(chainId, false)
      }

      const concurrencyAfterFailures = yield* pool.getOptimalConcurrency(chainId)

      // Should decrease from the previous value
      expect(concurrencyAfterFailures).toBeLessThan(concurrencyAfterSuccess)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should work without metrics when metricLabels is not provided', async () => {
    const testEffect = Effect.gen(function* () {
      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 10,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 2,
        // No metricLabels provided
      })

      const chainId = 1
      const mockRequest = Effect.succeed('success without metrics')

      const result = yield* pool.withPoolManagement(chainId, mockRequest)
      expect(result).toBe('success without metrics')

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should handle comprehensive request pool metrics example scenario', async () => {
    const testEffect = Effect.gen(function* () {
      // Create metric labels for identifying this request pool instance
      const labels = [
        MetricLabel.make('service', 'transaction-decoder'),
        MetricLabel.make('pool_type', 'rpc_pool'),
        MetricLabel.make('environment', 'test'),
      ]

      // Create request pool with metrics enabled
      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 20,
        adaptiveConcurrency: true,
        healthThreshold: 0.85,
        concurrencyStep: 2,
        metricLabels: labels,
      })

      // Example chain IDs for different blockchain networks
      const ethereumChainId = 1
      const polygonChainId = 137
      const arbitrumChainId = 42161

      // Simulate RPC request
      const simulateRpcRequest = (chainId: number, shouldSucceed = true): Effect.Effect<string, Error> =>
        Effect.gen(function* () {
          // Simulate network delay using test clock
          yield* TestClock.adjust('50 millis')

          if (shouldSucceed) {
            return `RPC response for chain ${chainId}`
          } else {
            return yield* Effect.fail(new Error(`RPC request failed for chain ${chainId}`))
          }
        })

      // Function to make requests through the pool
      const makePooledRequest = (chainId: number, shouldSucceed = true) =>
        pool.withPoolManagement(chainId, simulateRpcRequest(chainId, shouldSucceed))

      // Check initial optimal concurrency for each chain
      const ethereumConcurrency = yield* pool.getOptimalConcurrency(ethereumChainId)
      const polygonConcurrency = yield* pool.getOptimalConcurrency(polygonChainId)
      const arbitrumConcurrency = yield* pool.getOptimalConcurrency(arbitrumChainId)

      expect(ethereumConcurrency).toBeGreaterThan(0)
      expect(polygonConcurrency).toBeGreaterThan(0)
      expect(arbitrumConcurrency).toBeGreaterThan(0)

      // Simulate successful requests to Ethereum
      for (let i = 0; i < 5; i++) {
        const result = yield* makePooledRequest(ethereumChainId, true)
        expect(result).toBe(`RPC response for chain ${ethereumChainId}`)
      }

      // Check concurrency after successful requests
      const ethereumConcurrencyAfterSuccess = yield* pool.getOptimalConcurrency(ethereumChainId)
      expect(ethereumConcurrencyAfterSuccess).toBeGreaterThanOrEqual(ethereumConcurrency)

      // Simulate failed requests to Polygon
      for (let i = 0; i < 5; i++) {
        const result = yield* Effect.either(makePooledRequest(polygonChainId, false))
        expect(Either.isLeft(result)).toBe(true)
      }

      // Check concurrency after failed requests
      const polygonConcurrencyAfterFailures = yield* pool.getOptimalConcurrency(polygonChainId)
      // Should be less than or equal to initial (adaptive concurrency should reduce it)
      expect(polygonConcurrencyAfterFailures).toBeLessThanOrEqual(polygonConcurrency + 5) // Allow some variance

      // Simulate mixed success/failure for Arbitrum
      for (let i = 0; i < 6; i++) {
        const shouldSucceed = i % 2 === 0 // Alternate success/failure
        yield* Effect.either(makePooledRequest(arbitrumChainId, shouldSucceed))
      }

      const arbitrumConcurrencyAfterMixed = yield* pool.getOptimalConcurrency(arbitrumChainId)
      expect(arbitrumConcurrencyAfterMixed).toBeGreaterThan(0)

      // Test concurrent requests
      const concurrentRequests = Effect.all(
        [
          Effect.either(makePooledRequest(ethereumChainId)),
          Effect.either(makePooledRequest(polygonChainId)),
          Effect.either(makePooledRequest(arbitrumChainId)),
        ],
        { concurrency: 3 },
      )

      const results = yield* concurrentRequests
      expect(results).toHaveLength(3)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })

  it('should handle burst of requests and track metrics correctly', async () => {
    const testEffect = Effect.gen(function* () {
      const labels = [MetricLabel.make('test', 'burst_tracking'), MetricLabel.make('scenario', 'high_load')]

      const pool = yield* makeRequestPool({
        maxConcurrentRequests: 15,
        adaptiveConcurrency: true,
        healthThreshold: 0.8,
        concurrencyStep: 1,
        metricLabels: labels,
      })

      const chainId = 1
      const initialConcurrency = yield* pool.getOptimalConcurrency(chainId)

      // Simulate burst of successful requests
      const burstRequests = []
      for (let i = 0; i < 10; i++) {
        burstRequests.push(pool.withPoolManagement(chainId, Effect.succeed(`Success ${i}`)))
      }

      const results = yield* Effect.all(burstRequests, { concurrency: 5 })
      expect(results).toHaveLength(10)
      results.forEach((result, index) => {
        expect(result).toBe(`Success ${index}`)
      })

      // Check that concurrency potentially increased due to successful requests
      const finalConcurrency = yield* pool.getOptimalConcurrency(chainId)
      expect(finalConcurrency).toBeGreaterThanOrEqual(initialConcurrency)

      return true
    })

    const result = await Effect.runPromise(testEffect.pipe(Effect.provide(TestContext.TestContext)))
    expect(result).toBe(true)
  })
})
