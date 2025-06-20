import { Context, Effect, Layer, MetricLabel } from 'effect'
import { ContractData } from './types.js'
import { ContractMetaResolverStrategy } from './meta-strategy/request-model.js'
import * as CircuitBreaker from './circuit-breaker/circuit-breaker.js'
import * as RequestPool from './circuit-breaker/request-pool.js'

type ChainOrDefault = number | 'default'

export interface ContractMetaParams {
  address: string
  chainID: number
}

interface ContractMetaSuccess {
  status: 'success'
  result: ContractData
}

interface ContractMetaNotFound {
  status: 'not-found'
  result: null
}

interface ContractMetaEmpty {
  status: 'empty'
  result: null
}

export type ContractMetaResult = ContractMetaSuccess | ContractMetaNotFound | ContractMetaEmpty

export interface ContractMetaStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractMetaResolverStrategy[]>
  readonly set: (arg: ContractMetaParams, value: ContractMetaResult) => Effect.Effect<void, never>
  /**
   * The `get` function might return 3 states:
   * 1. `ContractMetaSuccess` - The contract metadata is found in the store
   * 2. `ContractMetaNotFound` - The contract metadata is found in the store, but is missing value
   * 3. `ContractMetaEmpty` - The contract metadata is not found in the store
   *
   *  We have state 2 to be able to skip the meta strategy in case we know that it's not available
   *  this can significantly reduce the number of requests to the strategies, and improve performance.
   *
   * Some strategies might be able to add the data later, because of that we encurage to store a timestamp
   * and remove the NotFound state to be able to check again.
   */
  readonly get: (arg: ContractMetaParams) => Effect.Effect<ContractMetaResult, never>
  readonly getMany?: (arg: Array<ContractMetaParams>) => Effect.Effect<Array<ContractMetaResult>, never>
  readonly circuitBreaker: CircuitBreaker.CircuitBreaker<unknown>
  readonly requestPool: RequestPool.RequestPool
}

export const ContractMetaStore = Context.GenericTag<ContractMetaStore>('@3loop-decoder/ContractMetaStore')

export const make = (args: Omit<ContractMetaStore, 'circuitBreaker' | 'requestPool'>) =>
  Effect.gen(function* () {
    const circuitBreaker = yield* CircuitBreaker.make({
      metricLabels: [MetricLabel.make('service', 'contract-meta-loader')],
    })

    const requestPool = yield* RequestPool.make({ metricLabels: [MetricLabel.make('service', 'contract-meta-loader')] })

    return {
      ...args,
      circuitBreaker,
      requestPool,
    }
  })
export const layer = (args: Omit<ContractMetaStore, 'circuitBreaker' | 'requestPool'>) =>
  Layer.effect(ContractMetaStore, make(args))
