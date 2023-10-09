import { Request } from 'effect'

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

export interface ContractABI {
    address?: Record<string, string>
    func?: Record<string, string>
    event?: Record<string, string>
}

export interface GetContractABIStrategy extends Request.Request<ResolveStrategyABIError, ContractABI>, FetchABIParams {
    readonly _tag: 'GetContractABIStrategy'
}

export const GetContractABIStrategy = Request.tagged<GetContractABIStrategy>('GetContractABIStrategy')
