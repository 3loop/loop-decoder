import { Data, Effect, RateLimiter } from 'effect'

export interface FetchABIParams {
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}

export class ResolveStrategyABIError extends Data.TaggedError('ResolveStrategyABIError')<{
  resolver: string
  address: string
  chainID: number
  message: string
}> {
  constructor(resolver: string, address: string, chainID: number, message: string) {
    super({ resolver, address, chainID, message })
  }
}

export class MissingABIStrategyError extends Data.TaggedError('MissingABIStrategyError')<{
  address: string
  chainId: number
  strategyId: string
  event?: string
  signature?: string
  message: string
}> {
  constructor(
    address: string,
    chainId: number,
    strategyId: string,
    event?: string,
    signature?: string,
    message = 'Missing contract ABI',
  ) {
    super({ address, chainId, strategyId, event, signature, message })
  }
}

interface FunctionFragmentABI {
  type: 'func'
  abi: string
  address: string
  chainID: number
  signature: string
}

interface EventFragmentABI {
  type: 'event'
  abi: string
  address: string
  chainID: number
  event: string
}

interface AddressABI {
  type: 'address'
  abi: string
  address: string
  chainID: number
}

export type ContractABI = FunctionFragmentABI | EventFragmentABI | AddressABI

export type RateLimiterOptions = RateLimiter.RateLimiter.Options

export interface ContractAbiResolverStrategy {
  type: 'address' | 'fragment'
  id: string
  rateLimit?: RateLimiterOptions
  resolver: (
    _: GetContractABIStrategyParams,
  ) => Effect.Effect<ContractABI[], ResolveStrategyABIError | MissingABIStrategyError>
}

export interface GetContractABIStrategyParams {
  chainId: number
  address: string
  strategyId: string
  event?: string
  signature?: string
}
