import * as React from 'react'
import DecodingForm from '@/app/calldata/form'
import { decodeCalldata, getRawCalldata } from '@/lib/decode'

export default async function CalldataPage({ params }: { params: { hash: string; chainID: number } }) {
  const res = await getRawCalldata(params.hash, params.chainID)

  if (!res) {
    return <DecodingForm data={''} chainID={params.chainID} />
  }

  const { data, contractAddress } = res

  try {
    const decoded = data
      ? await decodeCalldata({
          data,
          chainID: params.chainID,
          contractAddress,
        })
      : undefined

    return <DecodingForm decoded={decoded} data={data} contractAddress={contractAddress} chainID={params.chainID} />
  } catch (error) {
    console.error('Error decoding calldata:', error)
    return <DecodingForm data={data} />
  }
}
