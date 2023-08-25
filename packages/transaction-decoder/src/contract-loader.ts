import type { RequestResolver } from 'effect'
import { Context, Request } from 'effect'
import type { ContractData } from './types.js'

export class MissingABIError {
    readonly _tag = 'MissingABIError'
    constructor(
        readonly address: string,
        readonly signature: string,
    ) {}
}

export class MissingContractMetaError {
    readonly _tag = 'MissingContractMetaError'
    constructor(
        readonly address: string,
        readonly chain: number,
    ) {}
}

export type ContractABI = string

export interface GetContractABI extends Request.Request<MissingABIError, ContractABI | null> {
    readonly _tag: 'ContractABI'
    readonly address: string
    readonly signature: string
    readonly chainID: number
}

export const GetContractABI = Request.tagged<GetContractABI>('ContractABI')

export interface GetContractMeta extends Request.Request<MissingContractMetaError, ContractData | null> {
    readonly _tag: 'GetContractMeta'
    address: string
    chainID: number
}

export const GetContractMeta = Request.tagged<GetContractMeta>('GetContractMeta')

export interface ContractLoader {
    readonly _tag: 'ContractLoader'
    readonly contractABIResolver: RequestResolver.RequestResolver<GetContractABI>
    readonly contractMetaResolver: RequestResolver.RequestResolver<GetContractMeta>
}

export const ContractLoader = Context.Tag<ContractLoader>('@3loop-decoder/ContractLoader')
