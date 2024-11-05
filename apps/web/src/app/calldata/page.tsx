import * as React from 'react'
import DecodingForm from './form'
import { decodeCalldata } from '@/lib/decode'
import { CalldataParams } from './types'

export default async function CalldataPage({ searchParams }: { searchParams: CalldataParams }) {
  const chainID = Number(searchParams.chainID)
  try {
    const decoded = searchParams.data
      ? await decodeCalldata({
          data: searchParams.data,
          chainID,
          contractAddress: searchParams.contractAddress,
        })
      : undefined

    return (
      <DecodingForm
        decoded={decoded}
        chainID={chainID}
        data={searchParams.data}
        contractAddress={searchParams.contractAddress}
      />
    )
  } catch (error) {
    console.error('Error decoding calldata:', error)
    return <DecodingForm chainID={chainID} data={searchParams.data} contractAddress={searchParams.contractAddress} />
  }
}
