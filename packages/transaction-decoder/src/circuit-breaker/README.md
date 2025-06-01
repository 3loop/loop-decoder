# Circuit Breaker Module

A comprehensive circuit breaker implementation for Effect-based applications with advanced observability, metrics collection, and request pool management.

## Overview

The circuit breaker module provides fault tolerance and resilience patterns for handling failures in distributed systems. It includes:

- **Circuit Breaker**: Prevents cascading failures by monitoring and controlling request flow
- **Request Pool**: Manages concurrent requests with adaptive concurrency control
- **Comprehensive Metrics**: Detailed observability and monitoring capabilities
- **Real-time Notifications**: State change events and streaming observability

## Quick Start

### Basic Circuit Breaker

```typescript
import { Effect, Duration } from 'effect'
import * as CircuitBreaker from './circuit-breaker.js'

const program = Effect.gen(function* () {
  // Create a basic circuit breaker
  const circuitBreaker = yield* CircuitBreaker.make({
    maxFailures: 5,
    resetTimeout: Duration.seconds(60),
    halfOpenMaxCalls: 3,
  })

  // Use the circuit breaker to protect an operation
  const result = yield* circuitBreaker.withCircuitBreaker(
    'external-api',
    Effect.tryPromise(() => fetch('https://api.example.com/data').then((r) => r.json())),
  )

  return result
})
```

### With Metrics and Observability

```typescript
import { Effect, Duration, MetricLabel, Console } from 'effect'
import * as CircuitBreaker from './circuit-breaker.js'

const program = Effect.gen(function* () {
  // Create enhanced circuit breaker with full observability
  const circuitBreaker = yield* CircuitBreaker.make({
    maxFailures: 5,
    resetTimeout: Duration.seconds(60),

    // Enable metrics collection
    metricLabels: [
      MetricLabel.make('service', 'user-api'),
      MetricLabel.make('environment', 'production'),
      MetricLabel.make('version', '1.0'),
    ],

    // Get notified of state changes
    onStateChange: (change) => Console.log(`Circuit breaker state: ${change.from} → ${change.to}`),
  })

  // Monitor state changes in real-time
  const monitoring = circuitBreaker.stateChanges.pipe(
    Stream.tap((change) => Console.log(`Stream: ${change.from} → ${change.to}`)),
    Stream.runDrain,
    Effect.fork,
  )

  // Use the circuit breaker
  const result = yield* circuitBreaker.withCircuitBreaker('external-api', someExternalApiCall)

  return result
})
```

## Core Features

### 1. Circuit Breaker States

The circuit breaker operates in three states:

- **Closed** (0): Normal operation, requests pass through
- **Open** (2): Circuit is open, requests are rejected immediately
- **Half-Open** (1): Testing state, limited requests allowed to check if service recovered

### 2. Failure Strategies

#### Failure Count Strategy (Default)

Trips the circuit after a fixed number of consecutive failures:

```typescript
const circuitBreaker =
  yield *
  CircuitBreaker.make({
    maxFailures: 5, // Trip after 5 failures
    resetTimeout: Duration.seconds(60),
  })
```

#### Failure Rate Strategy

Trips based on failure percentage over a sliding window:

```typescript
const failureRateStrategy =
  yield *
  CircuitBreaker.failureRate({
    threshold: 0.5, // Trip at 50% failure rate
    minCalls: 10, // Need at least 10 calls to evaluate
    windowSize: 20, // Track last 20 calls
  })

const circuitBreaker =
  yield *
  CircuitBreaker.make({
    strategy: failureRateStrategy,
    resetTimeout: Duration.seconds(30),
  })
```

### 3. Error Classification

Control which errors count as failures using custom predicates:

```typescript
class NetworkError extends Error {
  readonly _tag = 'NetworkError'
}

const circuitBreaker =
  yield *
  CircuitBreaker.make({
    maxFailures: 3,
    isFailure: (error) => error instanceof NetworkError, // Only network errors count
  })
```

### 4. State Inspection

Check circuit breaker status without side effects:

```typescript
const currentState = yield * circuitBreaker.currentState('my-service')
const isHealthy = yield * circuitBreaker.isHealthy('my-service')

console.log(`State: ${currentState}, Healthy: ${isHealthy}`)
```

## Metrics and Observability

### Collected Metrics

When `metricLabels` is provided, the following metrics are automatically collected:

| Metric                                    | Type    | Description                                  |
| ----------------------------------------- | ------- | -------------------------------------------- |
| `effect_circuit_breaker_state`            | Gauge   | Current state (0=Closed, 1=HalfOpen, 2=Open) |
| `effect_circuit_breaker_state_changes`    | Counter | Number of state transitions                  |
| `effect_circuit_breaker_successful_calls` | Counter | Successful call count                        |
| `effect_circuit_breaker_failed_calls`     | Counter | Failed call count                            |
| `effect_circuit_breaker_rejected_calls`   | Counter | Rejected call count                          |

### State Change Events

Subscribe to state changes for real-time monitoring:

```typescript
// Immediate notifications via callback
const circuitBreaker =
  yield *
  CircuitBreaker.make({
    onStateChange: (change) =>
      Effect.gen(function* () {
        yield* Console.log(`State changed: ${change.from} → ${change.to}`)
        yield* alertingService.notify(`Circuit breaker state change at ${change.atNanos}`)
      }),
  })

// Continuous stream for dashboard updates
circuitBreaker.stateChanges.pipe(
  Stream.map((change) => ({
    service: 'user-api',
    timestamp: change.atNanos,
    state: change.to,
    transition: `${change.from}_to_${change.to}`,
  })),
  Stream.tap(dashboardApi.sendUpdate),
  Stream.runDrain,
  Effect.fork,
)
```

## Request Pool Management

The module also includes a request pool for managing concurrent requests with adaptive concurrency:

```typescript
import { make as makeRequestPool } from './request-pool.js'

const requestPool =
  yield *
  makeRequestPool({
    maxConcurrentRequests: 50,
    adaptiveConcurrency: true,
    healthThreshold: 0.85,
    concurrencyStep: 5,
    metricLabels: [MetricLabel.make('service', 'rpc-pool'), MetricLabel.make('chain', 'ethereum')],
  })

// Use the pool to manage requests
const result =
  yield *
  requestPool.withPoolManagement(
    1, // chainId
    Effect.tryPromise(() => makeRpcCall()),
  )
```

### Request Pool Metrics

| Metric                                        | Type    | Description                                      |
| --------------------------------------------- | ------- | ------------------------------------------------ |
| `effect_request_pool_active_requests`         | Gauge   | Current active requests                          |
| `effect_request_pool_max_concurrency`         | Gauge   | Current max concurrency setting                  |
| `effect_request_pool_success_rate`            | Gauge   | Success rate (0.0 to 1.0)                        |
| `effect_request_pool_state`                   | Gauge   | Pool state (0=healthy, 1=degraded, 2=overloaded) |
| `effect_request_pool_successful_requests`     | Counter | Total successful requests                        |
| `effect_request_pool_failed_requests`         | Counter | Total failed requests                            |
| `effect_request_pool_concurrency_adjustments` | Counter | Number of concurrency changes                    |

## Configuration Options

### Circuit Breaker Config

```typescript
interface Config<E = unknown> {
  // Core settings
  readonly maxFailures?: number // Default: 5
  readonly resetTimeout?: Duration.Duration // Default: 60 seconds
  readonly halfOpenMaxCalls?: number // Default: 3

  // Advanced strategies
  readonly strategy?: Effect.Effect<TrippingStrategy, never, never>
  readonly resetPolicy?: Schedule.Schedule<Duration.Duration, void, void>

  // Error handling
  readonly isFailure?: Predicate.Predicate<E>

  // Observability
  readonly metricLabels?: Iterable<MetricLabel.MetricLabel>
  readonly onStateChange?: (change: StateChange) => Effect.Effect<void>
}
```

### Request Pool Config

```typescript
interface RequestPoolConfig {
  readonly maxConcurrentRequests: number // Default: 50
  readonly adaptiveConcurrency: boolean // Default: true
  readonly healthThreshold: number // Default: 0.8
  readonly concurrencyStep: number // Default: 5
  readonly metricLabels?: Iterable<MetricLabel.MetricLabel>
}
```

## Use Cases

### 1. Microservices Protection

```typescript
const serviceCircuitBreaker =
  yield *
  CircuitBreaker.make({
    maxFailures: 5,
    resetTimeout: Duration.seconds(30),
    metricLabels: [
      MetricLabel.make('service', 'user-service'),
      MetricLabel.make('version', 'v2.1'),
      MetricLabel.make('datacenter', 'us-east-1'),
    ],
  })
```

### 2. Database Connection Protection

```typescript
const dbStrategy =
  yield *
  CircuitBreaker.failureRate({
    threshold: 0.3, // Trip at 30% failure rate
    minCalls: 5,
    windowSize: 15,
  })

const dbCircuitBreaker =
  yield *
  CircuitBreaker.make({
    strategy: dbStrategy,
    isFailure: (error) => error instanceof DatabaseError,
    onStateChange: (change) => alerting.notify(`DB Circuit Breaker: ${change.from} → ${change.to}`),
  })
```

### 3. External API Rate Limiting

```typescript
const apiPool =
  yield *
  makeRequestPool({
    maxConcurrentRequests: 20,
    adaptiveConcurrency: true,
    healthThreshold: 0.9,
    metricLabels: [MetricLabel.make('api', 'external-provider'), MetricLabel.make('tier', 'premium')],
  })

const apiCircuitBreaker =
  yield *
  CircuitBreaker.make({
    maxFailures: 3,
    resetTimeout: Duration.seconds(120),
    isFailure: (error) => error.status >= 500, // Only server errors
  })

// Combine both patterns
const protectedApiCall = (data: any) =>
  apiPool.withPoolManagement(
    1,
    apiCircuitBreaker.withCircuitBreaker(
      'external-api',
      Effect.tryPromise(() => externalApi.call(data)),
    ),
  )
```

## Performance Considerations

- **Zero Overhead**: Metrics only created when `metricLabels` is provided
- **Lazy Evaluation**: State streams only active when subscribed
- **Memory Efficient**: Failure rate strategy uses bounded sliding windows
- **Thread Safe**: All operations use Effect's concurrent primitives
- **Minimal Allocations**: Optimized data structures for high-throughput scenarios

## Testing

The module is designed to work seamlessly with Effect's testing utilities:

```typescript
import { TestClock, TestMetrics } from 'effect/Test'

const testProgram = Effect.gen(function* () {
  const circuitBreaker = yield* CircuitBreaker.make({
    maxFailures: 2,
    resetTimeout: Duration.seconds(10),
    metricLabels: [MetricLabel.make('test', 'suite')],
  })

  // Simulate failures
  yield* circuitBreaker.withCircuitBreaker('test', Effect.fail('error'))
  yield* circuitBreaker.withCircuitBreaker('test', Effect.fail('error'))

  // Advance time
  yield* TestClock.adjust(Duration.seconds(10))

  // Check metrics
  const metrics = yield* TestMetrics.get()
  expect(metrics.counters['effect_circuit_breaker_failed_calls']).toBe(2)
})
```

## Migration Guide

The enhanced version is fully backward compatible:

```typescript
// Old basic usage (still works)
const basic =
  yield *
  CircuitBreaker.make({
    maxFailures: 5,
    resetTimeout: Duration.seconds(60),
  })

// Enhanced usage (add features gradually)
const enhanced =
  yield *
  CircuitBreaker.make({
    maxFailures: 5,
    resetTimeout: Duration.seconds(60),
    metricLabels: [MetricLabel.make('service', 'api')], // Add metrics
    onStateChange: logStateChange, // Add notifications
    isFailure: isRetryableError, // Add error classification
  })
```

## API Reference

### Circuit Breaker

- `make<E>(config?: Config<E>): Effect<CircuitBreaker<E>>` - Create a new circuit breaker
- `withCircuitBreaker<A, E2, R>(strategyId: string, effect: Effect<A, E2, R>): Effect<A, E2 | OpenError, R>` - Execute effect with circuit breaker protection
- `currentState(strategyId: string): Effect<State>` - Get current state
- `isHealthy(strategyId: string): Effect<boolean>` - Check if circuit is healthy
- `stateChanges: Stream<StateChange>` - Stream of state change events

### Strategies

- `failureCount(maxFailures: number): Effect<TrippingStrategy>` - Fixed failure count strategy
- `failureRate(options): Effect<TrippingStrategy>` - Percentage-based failure strategy

### Request Pool

- `make(config?: RequestPoolConfig): Effect<RequestPool>` - Create a new request pool
- `withPoolManagement<A, E>(chainId: number, effect: Effect<A, E>): Effect<A, E>` - Execute with pool management
- `getOptimalConcurrency(chainId: number): Effect<number>` - Get optimal concurrency for chain
- `updateMetrics(chainId: number, success: boolean): Effect<void>` - Update pool metrics

### Types

- `State = 'Open' | 'Closed' | 'HalfOpen'` - Circuit breaker states
- `OpenError` - Error returned when circuit is open
- `StateChange` - State transition event with timestamp
- `TrippingStrategy` - Strategy for determining when to trip circuit

## Constants

Default configuration values are available in `constants.ts`:

```typescript
export const STRATEGY_TIMEOUT = '30 seconds'
export const DEFAULT_RETRY_TIMES = 2
export const INITIAL_RETRY_DELAY = '1 seconds'
export const MAX_CONCURRENT_REQUESTS = 50
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
export const CIRCUIT_BREAKER_RESET_TIMEOUT = '60 seconds'
export const REQUEST_POOL_HEALTH_THRESHOLD = 0.8
export const CONCURRENCY_ADJUSTMENT_STEP = 5
```
