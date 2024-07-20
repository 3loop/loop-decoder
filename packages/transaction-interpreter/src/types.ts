import { AssetType } from '@3loop/transaction-decoder'

export interface Interpreter {
  schema: string
  id: string
}

interface Address {
  address: string
  name: string | null
}

type TransactionType =
  | 'repay-loan'
  | 'deposit-collateral'
  | 'borrow'
  | 'withdraw-collateral'
  | 'swap'
  | 'wrap'
  | 'unwrap'
  | 'approve-token'
  | 'transfer-token'
  | 'unknown'
  | string

export interface Asset {
  address: string
  name: string | null
  symbol: string | null
  type: AssetType
}

export type AssetTransfer = {
  from: Address
  to: Address
  amount: string
  asset: Asset
}

export type InterpretedTransaction = {
  chain: number
  action: string
  txHash: string
  user: Address
  method: string | null
  type: TransactionType
  assetsSent: AssetTransfer[]
  assetsReceived: AssetTransfer[]
}
