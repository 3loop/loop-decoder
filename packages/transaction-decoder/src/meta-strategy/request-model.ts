import { UnknownNetwork } from '../public-client.js'
import { ContractData } from '../types.js'
import { Request } from 'effect'
import { Address } from 'viem'

export interface FetchMetaParams {
  readonly chainID: number
  readonly address: Address
}

export class ResolveStrategyMetaError {
  readonly _tag = 'ResolveStrategyMetaError'
  constructor(
    readonly resolverName: string,
    readonly address: Address,
    readonly chain: number,
  ) {}
}

// TODO: Remove UnknownNetwork
export interface GetContractMetaStrategy
  extends Request.Request<ContractData, ResolveStrategyMetaError | UnknownNetwork>,
    FetchMetaParams {
  readonly _tag: 'GetContractMetaStrategy'
}

export const GetContractMetaStrategy = Request.tagged<GetContractMetaStrategy>('GetContractMetaStrategy')
