import * as React from 'react'
import DecodingForm from './form'
import { decodeTransaction } from '@/lib/decode'
import { emptyInterpreter, findInterpreter } from '@/lib/interpreter'
import { defaultInterpreters } from '@/lib/default-interpreters'

export default async function TransactionPage({ params }: { params: { hash: string; chainID: number } }) {
  const decoded = await decodeTransaction({
    hash: params.hash,
    chainID: params.chainID,
  })

  if (!decoded) {
    return <DecodingForm currentHash={params.hash} currentChainID={params.chainID} />
  }

  const interpreter = await findInterpreter({
    decodedTx: decoded,
    interpreters: defaultInterpreters,
  })

  return (
    <DecodingForm
      decoded={decoded}
      defaultInterpreter={interpreter || emptyInterpreter}
      currentHash={params.hash}
      currentChainID={params.chainID}
    />
  )
}
