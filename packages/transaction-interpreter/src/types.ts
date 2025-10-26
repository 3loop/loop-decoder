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
  | 'sell-outcome'
  | 'buy-outcome'
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

export interface GenericInterpretedTransaction {
  action: string
  type: TransactionType
  chain: number
  txHash: string
  timestamp: number
  user: Address
  method: string | null
  assetsSent: AssetTransfer[]
  assetsReceived: AssetTransfer[]
  assetsMinted?: AssetTransfer[]
  assetsBurned?: AssetTransfer[]
  //extra and arbitrary context for the transaction
  context?: Record<string, unknown>
}

export interface InterpretedSwapTransaction extends GenericInterpretedTransaction {
  type: 'swap'
  context: {
    netSent: {
      amount: string
      asset: Asset
    }[]
    netReceived: {
      amount: string
      asset: Asset
    }[]
  }
}

export type InterpretedTransaction = GenericInterpretedTransaction | InterpretedSwapTransaction

export interface InterpreterOptions {
  interpretAsUserAddress?: string
}
