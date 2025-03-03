import type { DecodeResult } from '@3loop/transaction-decoder'

export interface CalldataParams {
  data: string
  chainID: string
  contractAddress?: string
}

export interface CalldataFormProps {
  data?: string
  chainID?: number
  contractAddress?: string
  decoded?: DecodeResult
  isLoading?: boolean
}
