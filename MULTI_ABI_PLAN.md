# Lazy Multi-ABI System with Cache Invalidation (Breaking Changes)

## Overview

This document outlines a lazy-loading approach to multi-ABI support that avoids excessive strategy requests by marking cached ABIs as invalid and retrying with additional strategies only when decoding fails. This approach maintains performance while enabling fallback decoding capabilities.

## 🎯 Current Implementation Status

**✅ COMPLETED: ABI Store Foundation (Phase 1)**
- Multi-ABI storage and retrieval
- Status tracking with 'success', 'invalid', 'not-found' states
- Precise cache invalidation by ABI ID
- SQL store with v3 table migration
- In-memory store with multi-ABI support

**🔄 NEXT: Lazy Loading Integration (Phase 2)**
- ABI loader fallback logic
- Effect.validateFirst integration
- Decode function enhancements

## Current System Analysis

### Current Flow
1. `getAndCacheAbi()` returns single `Abi` (best match)
2. Address strategies run first, fragments second
3. First successful strategy result is returned
4. Used in `calldata-decode.ts:169`, `trace-decode.ts:32,61`, `log-decode.ts:30`

### Key Issue
The comment at `abi-loader.ts:274-278` already identifies this exact need:
> "When failing to decode with one ABI, we should retry with other resolved ABIs. We can decode with Effect.validateFirst(abis, (abi) => decodeMethod(input as Hex, abi))"

### Lazy Loading Approach
This design uses lazy loading and cache invalidation to:
- **Avoid Excessive Requests**: Only fetch additional ABIs when primary ABI fails to decode
- **Maintain Performance**: Keep current fast path for successful decodes
- **Enable Fallbacks**: Progressively try additional strategies when needed
- **Preserve Cache Efficiency**: Mark specific ABIs as invalid rather than invalidating entire cache entries
- **Minimize Breaking Changes**: Keep current ABI loader interface mostly intact
- **Smart Strategy Selection**: Use decode failure context to choose next best strategy

### Effect-TS Lazy Evaluation Patterns

Effect-TS provides several constructs for lazy evaluation that are perfect for this use case:

1. **Effect.suspend()**: Defers execution until the effect is run
   - Used for recursive fallback chains
   - Prevents stack overflow in deep recursion
   - Allows conditional execution based on runtime state

2. **Effect.validateFirst()**: Tries effects in sequence until one succeeds
   - Already used in strategy executor
   - Perfect for ABI fallback scenarios
   - Stops at first success, doesn't execute remaining effects

3. **Effect.orElse()**: Provides fallback when an effect fails
   - Used throughout the codebase for error recovery
   - Can chain multiple fallbacks
   - Lazy evaluation of fallback effects

4. **Function Providers**: Pass functions instead of effects for true laziness
   - `() => getNextAbi()` instead of `getNextAbi()`
   - Only executed when actually needed
   - Allows dynamic parameter passing

### How It Works in Practice

1. **Normal Case (95% of requests)**:
   - `getAndCacheAbi()` returns cached ABI or fetches from first strategy
   - Decode succeeds with primary ABI
   - No additional network requests
   - Fallback providers are never executed

2. **Fallback Case (5% of requests)**:
   - Primary ABI fails to decode
   - `Effect.validateFirst()` or `Effect.orElse()` triggers next provider
   - Mark failed ABI as invalid in cache
   - Fetch next available strategy ABI lazily
   - Retry decode with new ABI
   - Continue until success or exhausted strategies

3. **Cache State**:
   - Each cache entry tracks multiple ABIs with validity flags
   - Invalid ABIs remain in cache but are skipped
   - Available strategies list tracks what hasn't been tried yet
   - New successful ABIs are added to existing cache entries

## Phase 1: ✅ Enhanced Cache with Invalidation Support (IMPLEMENTED)

**The ABI store has been successfully updated with multi-ABI support and status tracking capabilities.**

### 1.1 ✅ IMPLEMENTED: Updated Cache Types

The ABI store has been updated with the following implemented changes:

```typescript
// abi-store.ts - IMPLEMENTED: Simplified result structure
export interface ContractAbiResult {
  status: 'success'
  result: ContractABI[] // ✅ Now returns array of ABIs
}

// request-model.ts - IMPLEMENTED: Enhanced ContractABI with status tracking
interface FunctionFragmentABI {
  type: 'func'
  abi: string
  address: string
  chainID: number
  signature: string
  id?: string | number        // ✅ IMPLEMENTED: ID for precise updates
  source?: string            // ✅ IMPLEMENTED: Track ABI source
  status: 'success' | 'invalid' | 'not-found' // ✅ IMPLEMENTED: Status tracking
  timestamp?: string         // ✅ IMPLEMENTED: Timestamp tracking
}

// Similar updates for EventFragmentABI and AddressABI
```

**Key Implemented Features:**
- ✅ `ContractABI` now includes `id`, `source`, `status`, and `timestamp` fields
- ✅ `ContractAbiResult` now returns arrays of ABIs instead of single ABI
- ✅ Status tracking with 'success', 'invalid', 'not-found' states
- ✅ SQL store supports precise status updates by ID
- ✅ In-memory store supports multiple ABI storage and retrieval
```

### 1.2 ✅ IMPLEMENTED: Enhanced ABI Store Interface

The ABI store interface has been updated with the following implemented changes:

```typescript
// abi-store.ts - IMPLEMENTED: Enhanced interface
export interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: AbiParams, value: ContractAbiResult) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>

  // ✅ IMPLEMENTED: Status update method for cache invalidation
  readonly updateStatus?: (id: string | number, status: 'success' | 'invalid' | 'not-found') => Effect.Effect<void, never>

  readonly circuitBreaker: CircuitBreaker.CircuitBreaker<unknown>
  readonly requestPool: RequestPool.RequestPool
}
```

**Implementation Details:**
- ✅ **SQL Store**: Implements `updateStatus` with precise ID-based updates
- ✅ **In-Memory Store**: Implements `updateStatus` with cache entry removal for invalid ABIs
- ✅ **Multi-ABI Storage**: Both stores now handle arrays of ABIs in `set()` method
- ✅ **Efficient Retrieval**: `getMany()` optimized with single query and lookup maps

**Status Update Usage:**
```typescript
// Mark specific ABI as invalid by ID
yield* updateStatus(abiId, 'invalid')

// This allows precise invalidation without affecting other ABIs for the same contract
```

### 1.2 Modify Strategy Collection Logic

```typescript
// abi-loader.ts:191-245 - BREAKING: Collect ALL successful results instead of stopping at first
// Phase 1: Collect ALL address strategy results
const addressResults = yield* Effect.forEach(remaining, (req) => {
  const allAvailableStrategies = Array.prependAll(strategies.default, strategies[req.chainID] ?? []).filter(
    (strategy) => strategy.type === 'address',
  )

  return strategyExecutor
    .executeAllStrategies(allAvailableStrategies, {
      address: req.address,
      chainId: req.chainID,
      strategyId: 'address-batch',
    })
    .pipe(
      Effect.orElseSucceed(() => [])
    )
}, { concurrency })

// Phase 2: Collect ALL fragment strategy results for all requests
const fragmentResults = yield* Effect.forEach(remaining, ({ chainID, address, event, signature }) => {
  const allAvailableStrategies = Array.prependAll(strategies.default, strategies[chainID] ?? []).filter(
    (strategy) => strategy.type === 'fragment',
  )

  return strategyExecutor
    .executeAllStrategies(allAvailableStrategies, {
      address,
      chainId: chainID,
      event,
      signature,
      strategyId: 'fragment-batch',
    })
    .pipe(
      Effect.orElseSucceed(() => [])
    )
}, { concurrency })

// Flatten and combine all results
const allResults = [...addressResults.flat(), ...fragmentResults.flat()]

// Group results by request and store in cache
yield* Effect.forEach(
  remaining,
  (request, i) => {
    const requestResults = allResults.filter(abi =>
      abi.address === request.address &&
      (abi.type === 'address' ||
       (abi.type === 'func' && abi.signature === request.signature) ||
       (abi.type === 'event' && abi.event === request.event))
    )

    const prioritizedAbis = prioritizeAbis(requestResults)
    const result = prioritizedAbis.length > 0
      ? Effect.succeed(prioritizedAbis)
      : Effect.fail(new MissingABIError(request))

    const group = requestGroups[makeRequestKey(request)]
    const storeValue: ContractAbiResult = requestResults.length > 0
      ? { status: 'success', result: requestResults }
      : { status: 'not-found', result: null }

    return Effect.zipRight(
      setValue(request, storeValue),
      Effect.forEach(group, (req) => Request.completeEffect(req, result), { discard: true }),
    )
  },
  { concurrency: 'unbounded' }
)
```

### 1.3 Replace Strategy Executor Method

```typescript
// strategy-executor.ts - BREAKING: Replace executeStrategiesSequentially with executeAllStrategies
const executeAllStrategies = (
  strategies: ContractAbiResolverStrategy[],
  params: GetContractABIStrategyParams,
) => Effect.gen(function* () {
  // Filter out unhealthy strategies first
  const healthyStrategies: ContractAbiResolverStrategy[] = []

  for (const strategy of strategies) {
    const isHealthy = yield* circuitBreaker.isHealthy(strategy.id)
    if (isHealthy) {
      healthyStrategies.push(strategy)
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

  // Execute ALL strategies concurrently, collect successes
  const results = yield* Effect.forEach(
    healthyStrategies,
    (strategy) => executeStrategy(strategy, params).pipe(
      Effect.map(result => result.map(abi => ({ ...abi, strategyId: strategy.id }))),
      Effect.option // Convert failures to None
    ),
    { concurrency: 'unbounded' }
  )

  return results
    .filter(Option.isSome)
    .map(option => option.value)
    .flat()
})

// BREAKING: Remove executeStrategiesSequentially entirely
```

## Phase 2: Lazy ABI Loading with Fallback

### 2.1 Enhanced ABI Loader Interface

```typescript
// abi-loader.ts - Enhanced interface for lazy loading
export const getAndCacheAbi = (params: AbiStore.AbiParams) =>
  Effect.gen(function* () {
    // Handle special cases first (same as current)
    if (params.event === '0x' || params.signature === '0x') {
      return yield* Effect.fail(new EmptyCalldataError(params))
    }

    if (params.signature && params.signature === SAFE_MULTISEND_SIGNATURE) {
      return yield* Effect.succeed(SAFE_MULTISEND_ABI)
    }

    if (params.signature && AA_ABIS[params.signature]) {
      return yield* Effect.succeed(AA_ABIS[params.signature])
    }

    // Get cached result with validity info
    const cached = yield* Effect.request(new AbiLoader(params), AbiLoaderRequestResolver)

    // Return first valid ABI (maintains current interface)
    const validAbi = cached.find(abi => abi.isValid)
    if (validAbi) {
      return getBestMatch(validAbi.abi)
    }

    return yield* Effect.fail(new MissingABIError(params))
  })

// NEW: Function to get next ABI when current one fails
export const getNextAbi = (params: AbiStore.AbiParams, failedStrategyId: string, error: string) =>
  Effect.gen(function* () {
    const { markAbiInvalid, getNextStrategy } = yield* AbiStore.AbiStore

    // Mark the failed ABI as invalid
    yield* markAbiInvalid(params, failedStrategyId, error)

    // Get next available strategy
    const nextStrategyId = yield* getNextStrategy(params)

    if (!nextStrategyId) {
      return yield* Effect.fail(new MissingABIError(params))
    }

    // Execute next strategy
    const nextAbi = yield* executeNextStrategy(params, nextStrategyId)

    return getBestMatch(nextAbi)
  })
```

### 2.2 Strategy Execution Helper

```typescript
// abi-loader.ts - Helper to execute a specific strategy
const executeNextStrategy = (params: AbiStore.AbiParams, strategyId: string) =>
  Effect.gen(function* () {
    const { strategies, circuitBreaker, requestPool } = yield* AbiStore.AbiStore
    const strategyExecutor = StrategyExecutorModule.make(circuitBreaker, requestPool)

    // Find the specific strategy
    const allStrategies = Array.prependAll(strategies.default, strategies[params.chainID] ?? [])
    const strategy = allStrategies.find(s => s.id === strategyId)

    if (!strategy) {
      return yield* Effect.fail(new MissingABIError(params))
    }

    // Execute the specific strategy
    const result = yield* strategyExecutor.executeStrategy(strategy, {
      address: params.address,
      chainId: params.chainID,
      event: params.event,
      signature: params.signature,
      strategyId
    })

    // Store the new result
    const { addStrategyResult } = yield* AbiStore.AbiStore
    yield* addStrategyResult(params, result[0], strategyId)

    return result[0]
  })
```

### 2.3 Update ABI Store Retrieval Logic

```typescript
// abi-loader.ts - BREAKING: Update cache retrieval to handle multiple ABIs
const getMany = (requests: Array<AbiStore.AbiParams>) =>
  Effect.gen(function* () {
    const { getMany, get } = yield* AbiStore.AbiStore

    if (getMany != null) {
      return yield* getMany(requests)
    } else {
      return yield* Effect.all(
        requests.map(({ chainID, address, event, signature }) => get({ chainID, address, event, signature })),
        {
          concurrency: 'unbounded',
          batching: 'inherit',
        },
      )
    }
  })

// BREAKING: Update cache resolution to handle multiple ABIs
yield* Effect.forEach(
  cachedResults,
  ([request, abiResult]) => {
    const group = requestGroups[makeRequestKey(request)]

    // Handle multiple ABIs from cache
    const prioritizedAbis = abiResult && abiResult.status === 'success'
      ? prioritizeAbis(abiResult.result)
      : []

    const result = prioritizedAbis.length > 0
      ? Effect.succeed(prioritizedAbis)
      : Effect.fail(new MissingABIError(request))

    return Effect.forEach(group, (req) => Request.completeEffect(req, result), { discard: true })
  },
  {
    discard: true,
    concurrency: 'unbounded',
  },
)
```

### 1.5 ABI Prioritization Logic

```typescript
// abi-loader.ts - BREAKING: Replace single ABI return with prioritized array
const prioritizeAbis = (allResults: ContractABI[]): PrioritizedAbi[] => {
  const prioritized: PrioritizedAbi[] = []

  // Group by address vs fragment type
  const addressAbis = allResults.filter(abi => abi.type === 'address')
  const fragmentAbis = allResults.filter(abi => abi.type !== 'address')

  // Address ABIs get priority 1-N (highest priority)
  addressAbis.forEach((abi, index) => {
    const bestMatch = getBestMatch(abi)
    if (bestMatch) {
      prioritized.push({
        abi: bestMatch,
        source: 'address',
        strategyId: abi.strategyId,
        priority: index + 1
      })
    }
  })

  // Fragment ABIs get priority N+1 onwards
  fragmentAbis.forEach((abi, index) => {
    const bestMatch = getBestMatch(abi)
    if (bestMatch) {
      prioritized.push({
        abi: bestMatch,
        source: abi.type === 'func' ? 'fragment' : 'fragment',
        strategyId: abi.strategyId,
        priority: addressAbis.length + index + 1
      })
    }
  })

  return prioritized.sort((a, b) => a.priority - b.priority)
}
```

## Phase 2: Decoding Integration

### 2.1 Replace Main ABI Function

```typescript
// abi-loader.ts - BREAKING: Replace getAndCacheAbi with multi-ABI version
export const getAndCacheAbi = (params: AbiStore.AbiParams): Effect.Effect<PrioritizedAbi[], MissingABIError | EmptyCalldataError> =>
  Effect.gen(function* () {
    // Handle special cases first (same as current)
    if (params.event === '0x' || params.signature === '0x') {
      return yield* Effect.fail(new EmptyCalldataError(params))
    }

    if (params.signature && params.signature === SAFE_MULTISEND_SIGNATURE) {
      return [{
        abi: SAFE_MULTISEND_ABI,
        source: 'hardcoded' as const,
        strategyId: 'safe-multisend',
        priority: 0
      }]
    }

    if (params.signature && AA_ABIS[params.signature]) {
      return [{
        abi: AA_ABIS[params.signature],
        source: 'hardcoded' as const,
        strategyId: 'account-abstraction',
        priority: 0
      }]
    }

    const allResults = yield* Effect.request(new AbiLoader(params), AbiLoaderRequestResolver)
    return prioritizeAbis(allResults)
  }).pipe(
    Effect.withSpan('AbiLoader.GetAndCacheAbi', {
      attributes: {
        chainId: params.chainID,
        address: params.address,
        event: params.event,
        signature: params.signature,
      },
    }),
  )

// BREAKING: Remove backward compatibility wrapper
```

## Phase 3: Lazy Decode Functions with Fallback

### 3.1 Enhanced Decode Functions (Effect-TS Recommended Patterns)

```typescript
// abi-decode.ts - Using Effect-TS lazy evaluation patterns
export const decodeMethodWithFallback = (
  data: Hex,
  params: AbiStore.AbiParams
): Effect.Effect<DecodeResult, DecodeError> =>
  Effect.gen(function* () {
    // Create lazy ABI providers - these are not executed until needed
    const getPrimaryAbi = () => getAndCacheAbi(params)
    const getFallbackAbi = (strategyId: string, error: string) =>
      getNextAbi(params, strategyId, error)

    // Try primary ABI first
    const primaryResult = yield* Effect.flatMap(
      getPrimaryAbi(),
      (abi) => decodeMethod(data, abi)
    ).pipe(
      Effect.tapError(error =>
        Effect.logDebug(`Primary ABI decode failed: ${error.message}`)
      ),
      Effect.either
    )

    if (Either.isRight(primaryResult)) {
      return primaryResult.right
    }

    // Use Effect.suspend for lazy fallback chain
    const tryFallbacks = (currentError: DecodeError, attempts: number): Effect.Effect<DecodeResult, DecodeError> =>
      Effect.suspend(() => {
        if (attempts >= 3) {
          return Effect.fail(currentError)
        }

        return Effect.flatMap(
          getFallbackAbi('unknown', currentError.message),
          (nextAbi) => decodeMethod(data, nextAbi)
        ).pipe(
          Effect.tapBoth({
            onFailure: (error) => Effect.logDebug(`Fallback attempt ${attempts + 1} failed: ${error.message}`),
            onSuccess: () => Effect.logDebug(`Decode succeeded with fallback ABI after ${attempts + 1} attempts`)
          }),
          Effect.orElse((error) => tryFallbacks(error, attempts + 1))
        )
      })

    return yield* tryFallbacks(primaryResult.left, 0)
  })

// Alternative approach using Effect.validateFirst with lazy ABI providers
export const decodeMethodWithValidateFirst = (
  data: Hex,
  params: AbiStore.AbiParams
): Effect.Effect<DecodeResult, DecodeError> =>
  Effect.gen(function* () {
    // Create array of lazy ABI providers
    const abiProviders = [
      () => getAndCacheAbi(params),
      () => getNextAbi(params, 'primary-failed', 'Primary decode failed'),
      () => getNextAbi(params, 'secondary-failed', 'Secondary decode failed'),
    ]

    // Use validateFirst with lazy evaluation - Effect-TS will only call providers as needed
    return yield* Effect.validateFirst(
      abiProviders,
      (getAbi) => Effect.flatMap(getAbi(), (abi) => decodeMethod(data, abi))
    )
  })

// Keep original decodeMethod for internal use
const decodeMethod = (data: Hex, abi: Abi): Effect.Effect<DecodeResult, DecodeError> =>
  Effect.try({
    try: () => decodeFunctionData({ abi, data }),
    catch: (error) => new DecodeError(`Failed to decode method: ${data}`, error),
  })
```

### 3.2 Update Calldata Decode

```typescript
// calldata-decode.ts:169 - Use lazy fallback approach
export const decodeMethod = ({
  data,
  chainID,
  contractAddress,
}: {
  data: Hex
  chainID: number
  contractAddress: string
}) =>
  Effect.gen(function* () {
    const signature = data.slice(0, 10)

    // ... proxy logic same ...

    const abiParams = {
      address: implementationAddress ?? contractAddress,
      signature,
      chainID,
    }

    const decoded = yield* AbiDecoder.decodeMethodWithFallback(data, abiParams)

    // ... rest of function same ...
  })
```

### 3.3 Update Trace Decode

```typescript
// trace-decode.ts:32 - Use lazy fallback approach
const decodeTraceLog = (call: TraceLog, transaction: GetTransactionReturnType) =>
  Effect.gen(function* () {
    if ('to' in call.action && 'input' in call.action) {
      const { to, input, from } = call.action
      const chainID = Number(transaction.chainId)
      const signature = call.action.input.slice(0, 10)
      const contractAddress = to

      const abiParams = {
        address: contractAddress,
        signature,
        chainID,
      }

      const method = yield* AbiDecoder.decodeMethodWithFallback(input as Hex, abiParams)

      return {
        ...method,
        from,
        to,
      } as DecodeTraceResult
    }

    return yield* new DecodeError(`Could not decode trace log ${stringify(call)}`)
  })

// Error trace decode with hardcoded ABIs first
const decodeTraceLogOutput = (call: TraceLog, chainID: number) =>
  Effect.gen(function* () {
    if (call.result && 'output' in call.result && call.result.output !== '0x') {
      const data = call.result.output as Hex
      const signature = data.slice(0, 10)

      // Try hardcoded error ABIs first
      const hardcodedResult = yield* Effect.either(
        decodeMethod(data, [...solidityPanic, ...solidityError])
      )

      if (Either.isRight(hardcodedResult)) {
        return hardcodedResult.right
      }

      // Fallback to strategy-based ABIs for custom errors
      if (!errorFunctionSignatures.includes(signature)) {
        const abiParams = {
          address: '',
          signature,
          chainID,
        }

        return yield* AbiDecoder.decodeMethodWithFallback(data, abiParams)
      }
    }
  })
```

## Phase 4: Implementation Summary

### 4.1 Breaking Changes Summary

1. **ABI Store Interface**: Add cache invalidation methods (`markAbiInvalid`, `getNextStrategy`, `addStrategyResult`)
2. **Cache Entry Structure**: `ContractAbiSuccess.result` becomes `CachedAbi[]` with validity tracking
3. **ABI Loader**: Add `getNextAbi()` function for lazy fallback loading
4. **Decode Functions**: Enhanced with lazy fallback logic using `decodeMethodWithFallback`
5. **Strategy Tracking**: Track available vs exhausted strategies per cache entry
6. **Minimal Interface Changes**: `getAndCacheAbi()` keeps same signature but internal behavior changes

### 4.2 Implementation Strategy

**Lazy Loading Approach**
- Maintain current performance for successful decode cases
- Only fetch additional ABIs when primary ABI fails to decode
- Preserve existing ABI loader interface for easier migration
- Add cache invalidation without breaking existing cache structure
- Progressive fallback with configurable retry limits

### 3.3 Implementation Status

#### ✅ COMPLETED: Phase 1 - Cache Types and ABI Store Interface
- ✅ **ContractABI Type**: Added `id`, `source`, `status`, `timestamp` fields
- ✅ **ContractAbiResult**: Now returns arrays of ABIs instead of single ABI
- ✅ **ABI Store Interface**: Added `updateStatus()` method for cache invalidation
- ✅ **SQL Store**: Implements precise ID-based status updates with v3 table migration
- ✅ **In-Memory Store**: Implements multi-ABI storage and status updates

#### 🔄 IN PROGRESS: Phase 2 - Lazy ABI Loading Implementation
- ⏳ **ABI Loader Updates**: Need to implement lazy fallback logic
- ⏳ **Effect.validateFirst Integration**: Use existing patterns for ABI fallbacks
- ⏳ **Strategy Selection**: Implement logic to choose next best strategy

#### 📋 TODO: Phase 3 - Decode Functions with Fallback Logic
- ⏳ **decodeMethodWithFallback()**: Implement using Effect-TS lazy patterns
- ⏳ **Calldata Decode**: Update to use lazy fallback approach
- ⏳ **Trace Decode**: Update to use lazy fallback approach
- ⏳ **Log Decode**: Update to use lazy fallback approach

#### 📋 TODO: Phase 4 - Integration and Testing
- ⏳ **End-to-End Integration**: Connect all components
- ⏳ **Performance Testing**: Validate no regression for successful cases
- ⏳ **Fallback Testing**: Test retry scenarios and limits

#### 📋 TODO: Phase 5 - Optimization and Monitoring
- ⏳ **Metrics**: Add observability for fallback success rates
- ⏳ **Performance Tuning**: Optimize based on real-world usage
- ⏳ **Documentation**: Update API documentation

### 3.4 Next Steps for Implementation

**Immediate Next Steps (Phase 2):**

1. **Update ABI Loader to Use New Store Structure**
   ```typescript
   // Need to update getAndCacheAbi to handle ContractABI[] results
   // Filter for valid ABIs (status !== 'invalid')
   // Return first valid ABI to maintain current interface
   ```

2. **Implement Lazy Fallback Logic**
   ```typescript
   // Add decodeMethodWithFallback using Effect.validateFirst
   // Create ABI providers that only execute when needed
   // Use updateStatus() to mark failed ABIs as invalid
   ```

3. **Update Decode Functions**
   ```typescript
   // Modify calldata-decode.ts to use fallback approach
   // Modify trace-decode.ts to use fallback approach
   // Modify log-decode.ts to use fallback approach
   ```

**Migration Considerations:**
- ✅ **ABI Store**: Already migrated to support multiple ABIs
- ✅ **Cache Structure**: SQL store automatically migrated to v3 with status tracking
- ⏳ **ABI Loader**: Needs updates to use new store structure
- ⏳ **Decode Functions**: Need fallback logic implementation
- ⏳ **Consumer Impact**: Minimal - existing interface maintained with enhanced fallback behavior

**Testing Strategy**:
- Focus on comprehensive integration tests with real contract data
- Test fallback behavior with multiple ABIs
- Verify performance improvements vs. current implementation
- Ensure circuit breaker functionality works with concurrent strategy execution

**Rollback Plan**:
- Keep current implementation in a separate branch until migration is proven stable
- Feature flag the new implementation initially for gradual rollout
- Monitor decode success rates and performance metrics closely

## Phase 4: Performance Considerations

### 4.1 Caching Strategy

```typescript
// BREAKING: Update ABI store to handle multiple ABIs
interface CacheEntry {
  results: ContractABI[]       // All raw ABI results from strategies
  timestamp: number
  metadata: {
    totalStrategiesExecuted: number
    successfulStrategies: string[]
    failedStrategies: string[]
  }
}

// ABI Store implementation updates
export interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: AbiParams, value: ContractAbiResult) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>
  readonly circuitBreaker: CircuitBreaker.CircuitBreaker<unknown>
  readonly requestPool: RequestPool.RequestPool
}

// Cache retrieval now returns multiple ABIs that get prioritized at request time
const getCachedAbis = (params: AbiParams): Effect.Effect<ContractABI[], never> =>
  Effect.gen(function* () {
    const { get } = yield* AbiStore.AbiStore
    const result = yield* get(params)

    return result.status === 'success' ? result.result : []
  })
```

### 4.2 Strategy Execution Optimization

- **Concurrent Execution**: Run all healthy strategies in parallel
- **Early Termination**: Option to stop after N successful results
- **Strategy Health**: Skip unhealthy strategies more aggressively
- **Request Pooling**: Maintain existing concurrency controls

### 4.3 Memory Management

- **Deduplication**: Avoid storing duplicate ABIs from different strategies
- **TTL**: Implement cache expiration for multi-ABI results
- **Size Limits**: Limit number of ABIs stored per cache key

## Phase 5: Testing Strategy

### 5.1 Unit Tests

- Test ABI prioritization logic
- Test `validateFirst` with multiple ABIs
- Test fallback behavior when first ABI fails
- Test backward compatibility

### 5.2 Integration Tests

- Test with real contracts having multiple ABI sources
- Test performance impact of multi-ABI loading
- Test circuit breaker behavior with multiple strategies

### 5.3 Performance Tests

- Compare single vs multi-ABI loading times
- Test memory usage with large ABI arrays
- Test concurrency limits with multiple strategies

## Expected Benefits

1. **Improved Decode Success Rate**: Fallback to alternative ABIs when primary fails
2. **Maintained Performance**: No performance impact for successful primary ABI decodes
3. **Reduced Network Requests**: Only fetch additional ABIs when actually needed
4. **Smart Fallback**: Progressive retry with different strategies based on failure context
5. **Cache Efficiency**: Mark specific ABIs as invalid rather than invalidating entire entries
6. **Resilience**: System continues working even if primary ABI source is incorrect
7. **Enhanced Observability**: Track decode failures and successful fallback strategies
8. **Minimal Breaking Changes**: Keep existing ABI loader interface mostly intact

## Implementation Timeline

- **Week 1-2**: Phase 1 - Core ABI loader changes
- **Week 3**: Phase 2 - New multi-ABI functions
- **Week 4**: Phase 3 - Update decode functions
- **Week 5**: Phase 4 - Performance testing and optimization
- **Week 6**: Phase 5 - Testing and documentation

## Effect-TS Recommended Implementation

Based on the current codebase patterns and Effect-TS best practices, the recommended approach is:

### 1. Use Effect.validateFirst for ABI Fallbacks
```typescript
// This pattern is already used in strategy-executor.ts
export const decodeWithFallback = (data: Hex, params: AbiStore.AbiParams) =>
  Effect.gen(function* () {
    const abiProviders = yield* createAbiProviders(params)

    return yield* Effect.validateFirst(
      abiProviders,
      (getAbi) => Effect.flatMap(getAbi(), (abi) => decodeMethod(data, abi))
    )
  })
```

### 2. Use Function Providers for True Laziness
```typescript
// Pass functions instead of effects for lazy evaluation
const abiProviders = [
  () => getAndCacheAbi(params),
  () => getNextAbi(params, 'primary-failed', 'decode failed'),
  () => getNextAbi(params, 'secondary-failed', 'decode failed'),
]
```

### 3. Use Effect.orElse for Simple Fallback Chains
```typescript
// For simple 2-step fallback
export const decodeWithSimpleFallback = (data: Hex, params: AbiStore.AbiParams) =>
  Effect.flatMap(getAndCacheAbi(params), (abi) => decodeMethod(data, abi))
    .pipe(
      Effect.orElse(() =>
        Effect.flatMap(
          getNextAbi(params, 'primary-failed', 'decode failed'),
          (fallbackAbi) => decodeMethod(data, fallbackAbi)
        )
      )
    )
```

### 4. Use Effect.suspend for Recursive Patterns
```typescript
// For complex retry logic with state
const retryWithFallback = (attempts: number): Effect.Effect<DecodeResult, DecodeError> =>
  Effect.suspend(() => {
    if (attempts >= maxAttempts) {
      return Effect.fail(new DecodeError('All attempts exhausted'))
    }

    return tryNextAbi().pipe(
      Effect.orElse(() => retryWithFallback(attempts + 1))
    )
  })
```

## Success Metrics

- Decode success rate improvement (target: +15-20%)
- No performance regression for successful primary ABI decodes
- Minimal increase in network requests (only when fallback is needed)
- Circuit breaker and resilience features remain functional
- Memory usage increase stays minimal (only store validity flags)
- Successful lazy loading of fallback ABIs when needed
- Reduced unnecessary strategy executions compared to prefetch approach
- Consistent with Effect-TS patterns used throughout the codebase
