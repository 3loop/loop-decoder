import type { ParamType } from 'ethers'
import type { TraceLog } from './schema/trace.js'

export interface RawTxData {
    txTrace: TraceLog[]
}

export interface Node {
    name: ParamType['name']
    type: ParamType['type']
}

export interface Tree extends Node {
    components: (InputArg | TreeNode)[]
    value?: never
}

export type TreeNode = InputArg | Tree

export type MostTypes = string | number | boolean | null | string[]

export interface InputArg extends Node {
    value: string
    components?: never
}

export interface DecodeResult {
    name: string
    signature: string
    type: string
    params?: InputArg[]
}

export interface DecodeTraceResult extends DecodeResult {
    from: string
    to: string
}

export interface DecodedLogEvent {
    name: string
    type: string
    value: string | string[]
}

export interface RawDecodedLog {
    name: string | null
    address: string
    logIndex: number
    events: DecodedLogEvent[]
    decoded: boolean
}

export const enum ContractType {
    ERC20 = 'ERC20',
    ERC721 = 'ERC721',
    ERC1155 = 'ERC1155',
    WETH = 'WETH',
    OTHER = 'OTHER',
}

export interface ContractData {
    address: string
    contractName: string
    contractAddress: string
    tokenSymbol: string
    decimals?: number
    contractOfficialName: string
    type: ContractType
    chainID: number
}

export interface Interaction {
    contractName: string | null
    contractSymbol: string | null
    contractAddress: string
    decimals: number | null
    chainID: number
    contractType: ContractType
    events: InteractionEvent[]
}

export interface InteractionEvent {
    eventName: string | null
    nativeTransfer?: true
    logIndex: number | null
    params: InteractionEventParams
    decoded?: boolean
}

export interface InteractionEventParams {
    to?: string | null
    from?: string | null
    dst?: string | null
    src?: string | null
    [key: string]: string | string[] | undefined | null | number | boolean
}

export interface DecodedTx {
    txHash: string
    txType: TxType
    contractType: ContractType
    methodCall: MethodCall
    traceCalls: DecodeTraceResult[]
    contractName: string | null
    officialContractName: string | null
    interactions: Interaction[]
    nativeValueSent: string
    chainSymbol: string
    chainID: number
    txIndex: number
    fromAddress: string
    toAddress: string | null
    reverted: boolean
    timestamp: number
    gasUsed: string
    effectiveGasPrice: string | null
    allAddresses: string[]
}

export interface MethodCall {
    name: string | null
    arguments: InputArg[]
    decoded?: boolean
}

export const enum TxType {
    TRANSFER = 'native token transfer',
    CONTRACT_DEPLOY = 'contract deploy',
    CONTRACT_INTERACTION = 'contract interaction',
}
