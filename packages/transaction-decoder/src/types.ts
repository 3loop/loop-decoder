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
}

export type ContractType = 'ERC20' | 'ERC721' | 'ERC1155' | 'WETH' | 'Gnosis Safe' | 'OTHER'

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
  contractName: string | null
  contractSymbol: string | null
  contractAddress: string
  decimals: number | null
  chainID: number
  contractType: ContractType
  event: InteractionEvent
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
  tokenId?: string | null // ERC721
  [key: string]: string | string[] | undefined | null | number | boolean
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
  fromAddress: string
  toAddress: string | null
  reverted: boolean
  timestamp: number
  gasUsed: string
  gasPaid: string
  effectiveGasPrice: string | null
  assetsReceived: Asset[]
  assetsSent: Asset[]
  interactedAddresses: string[]
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
  name: string | null
  symbol: string | null
  address: string
  amount?: string
  token0?: Asset
  token1?: Asset
  pair?: string // "RARE-WETH"
  tokenId?: string
}

export interface InternalEvent {
  txHash: string
  userAddress: string
  contractName: string | null
  contractAddress: string | null
  assetsSent: Asset[]
  assetsReceived: Asset[]
  chainSymbol: string
  reverted: boolean
  gasPaid: string
  timestamp: number | null
  methodName?: string
  eventName?: string
}

export interface Interpreter {
  id: string
  schema: string
}
