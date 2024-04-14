import { Request } from 'effect'

export interface FetchABIParams {
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}

export class ResolveStrategyABIError {
  readonly _tag = 'ResolveStrategyABIError'
  constructor(readonly resolverName: string, readonly address: string, readonly chain: number) {}
}

//NOTE: we store address as key to be able to know adddress to abi mapping for caching
export interface ContractABI {
  address?: Record<string, string>
  func?: Record<string, string>
  event?: Record<string, string>
}

export interface GetContractABIStrategy extends Request.Request<ContractABI, ResolveStrategyABIError>, FetchABIParams {
  readonly _tag: 'GetContractABIStrategy'
}

export const GetContractABIStrategy = Request.tagged<GetContractABIStrategy>('GetContractABIStrategy')
