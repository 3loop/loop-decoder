import { AssetType } from '@3loop/transaction-decoder'

export interface Interpreter {
  schema: string
  id: string
}

interface Address {
  address: string
  name: string | null
}
type StringWithAutocompleteOptions<TOptions extends string> = (string & Record<string, never>) | TOptions

type TransactionType = StringWithAutocompleteOptions<
  | 'repay-loan'
  | 'deposit-collateral'
  | 'borrow'
  | 'withdraw-collateral'
  | 'swap'
  | 'wrap'
  | 'unwrap'
  | 'approve-token'
  | 'transfer-token'
  | 'approve-nft'
  | 'transfer-nft'
  | 'send-to-bridge'
  | 'receive-from-bridge'
  | 'account-abstraction'
  | 'stake-token'
  | 'unstake-token'
  | 'burn'
  | 'mint'
  | 'batch'
  | 'unknown'
>

export interface Asset {
  address: string
  name: string | null
  symbol: string | null
  type: AssetType
  tokenId?: string
}

export type AssetTransfer = {
  from: Address
  to: Address
  amount: string
  asset: Asset
}

export type Payment = Omit<AssetTransfer, 'to' | 'from'>

export type InterpretedTransaction = {
  chain: number
  action: string
  txHash: string
  timestamp: number
  user: Address
  method: string | null
  type: TransactionType
  assetsSent: AssetTransfer[]
  assetsReceived: AssetTransfer[]
  assetsMinted?: AssetTransfer[]
  assetsBurned?: AssetTransfer[]
}
