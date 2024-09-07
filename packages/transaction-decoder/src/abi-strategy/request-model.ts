import { Request, RequestResolver } from 'effect'

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

// NOTE: We might want to return a list of ABIs, this might be helpful when fetching for signature
export interface GetContractABIStrategy
  extends Request.Request<ContractABI[], ResolveStrategyABIError>,
    FetchABIParams {
  readonly _tag: 'GetContractABIStrategy'
}

export const GetContractABIStrategy = Request.tagged<GetContractABIStrategy>('GetContractABIStrategy')

export interface ContractAbiResolverStrategy {
  type: 'address' | 'fragment'
  resolver: RequestResolver.RequestResolver<GetContractABIStrategy, never>
}
