'use client'
import * as React from 'react'
import DecodingForm from './[hash]/form'

export default function TransactionsPlayground({ params }: { params: { chainID: number } }) {
  return <DecodingForm chainID={params.chainID} />
}
