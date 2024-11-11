import * as React from 'react'
import DecodingForm from './[hash]/form'

export default async function TransactionPage({ params }: { params: { chainID: number } }) {
  return <DecodingForm chainID={params.chainID} />
}
