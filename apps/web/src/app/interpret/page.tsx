'use client'
import * as React from 'react'
import DecodingForm from './[chainID]/[hash]/form'
import { DEFAULT_CHAIN_ID } from '../data'

export default function TransactionsPlayground() {
  return <DecodingForm currentChainID={DEFAULT_CHAIN_ID} />
}
