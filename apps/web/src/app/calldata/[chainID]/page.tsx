import * as React from 'react'
import DecodingForm from '@/app/calldata/form'

export default async function CalldataPage({ params }: { params: { chainID: number } }) {
  return <DecodingForm chainID={params.chainID} />
}
