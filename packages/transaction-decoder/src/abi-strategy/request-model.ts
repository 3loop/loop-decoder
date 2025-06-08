import { Effect, RateLimiter } from 'effect'

export interface FetchABIParams {
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}

export class ResolveStrategyABIError {
  readonly _tag = 'ResolveStrategyABIError'
  constructor(
    readonly resolverName: string,
    readonly address: string,
    readonly chain: number,
  ) {}
}

export class MissingABIError {
  readonly _tag = 'MissingABIError'
  constructor(
    readonly address: string,
    readonly chainId: number,
    readonly strategyId: string,
    readonly event?: string,
    readonly signature?: string,
    readonly message: string = 'Missing contract ABI',
  ) {}
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
  resolver: (_: GetContractABIStrategyParams) => Effect.Effect<ContractABI[], ResolveStrategyABIError | MissingABIError>
}

export interface GetContractABIStrategyParams {
  chainId: number
  address: string
  strategyId: string
  event?: string
  signature?: string
}
