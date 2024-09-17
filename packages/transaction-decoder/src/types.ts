import { Address } from 'viem'
import type { TraceLog } from './schema/trace.js'

export interface RawTxData {
  txTrace: TraceLog[]
}

export interface Node {
  name: string
  type: string
}

export interface Tree extends Node {
  components: (InputArg | TreeNode)[]
  value?: never
}

export type TreeNode = InputArg | Tree

export type MostTypes = string | number | boolean | null | string[]

export interface InputArg extends Node {
  value: string | string[]
  components?: never
}

export interface DecodeResult {
  name: string
  signature: string
  type: string
  params?: TreeNode[]
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
  signature: string
}

export type ContractType = 'ERC20' | 'ERC721' | 'ERC1155' | 'WETH' | 'OTHER' | string

export interface ContractData {
  address: string
  contractName: string
  contractAddress: string
  tokenSymbol: string
  decimals?: number
  type: ContractType
  chainID: number
}

export interface Interaction {
  contractName: Address | null
  contractSymbol: string | null
  contractAddress: Address
  decimals: number | null
  chainID: number
  contractType: ContractType
  signature: string | null
  event: InteractionEvent
}

export interface NativeEventTransferParams {
  from: Address
  to: Address
  value: string
}

export interface NativeEventTransfer {
  eventName: string
  logIndex: number | null
  params: NativeEventTransferParams
  nativeTransfer: true
}

export type InteractionEvent =
  | NativeEventTransfer
  | {
      eventName: string | null
      logIndex: number | null
      params: EventParams
      decoded?: boolean
    }

export interface EventParams {
  [key: string]: string | string[] | undefined | null | number | boolean
}

export interface DecodedError {
  error: string
  message: string | null
}

export interface DecodedTx {
  txHash: string
  txType: TxType
  contractType: ContractType
  methodCall: MethodCall
  traceCalls: DecodeTraceResult[]
  contractName: string | null
  interactions: Interaction[]
  nativeValueSent: string
  chainSymbol: string
  chainID: number
  txIndex: number
  fromAddress: Address
  toAddress: Address | null
  reverted: boolean
  timestamp: number
  gasUsed: string
  gasPaid: string
  effectiveGasPrice: string | null
  transfers: Asset[]
  interactedAddresses: string[]
  errors: DecodedError[] | null
  addressesMeta: Record<Address, ContractData>
}

export interface MethodCall {
  name: string | null
  arguments: TreeNode[]
  decoded?: boolean
}

export const enum TxType {
  TRANSFER = 'native token transfer',
  CONTRACT_DEPLOY = 'contract deploy',
  CONTRACT_INTERACTION = 'contract interaction',
}

export const enum AssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  LPToken = 'LPToken',
  DEFAULT = 'unknown',
  native = 'native',
}

export interface Asset {
  type: AssetType
  from: string
  to: string
  name: string | null
  symbol: string | null
  address: string
  amount?: string
  token0?: Asset
  token1?: Asset
  pair?: string // "RARE-WETH"
  tokenId?: string
}
