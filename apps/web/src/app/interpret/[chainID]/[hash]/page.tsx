import * as React from 'react'
import DecodingForm from './form'
import { decodeTransaction } from '@/lib/decode'

export default async function TransactionPage({ params }: { params: { hash: string; chainID: number } }) {
  const decoded = await decodeTransaction({
    hash: params.hash,
    chainID: params.chainID,
  })

  if (!decoded || !decoded.toAddress) {
    return <DecodingForm currentHash={params.hash} chainID={params.chainID} />
  }

  return <DecodingForm decoded={decoded} currentHash={params.hash} chainID={params.chainID} />
}
