import * as React from 'react'
import DecodingForm from './form'
import { decodeTransaction } from '@/lib/decode'

export default async function TransactionPage({ params }: { params: { hash: string; chainID: number } }) {
  const result = await decodeTransaction({
    hash: params.hash,
    chainID: params.chainID,
  })

  return (
    <DecodingForm decoded={result.decoded} error={result.error} currentHash={params.hash} chainID={params.chainID} />
  )
}
