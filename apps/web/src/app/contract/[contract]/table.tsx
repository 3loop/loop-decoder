'use client'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import React from 'react'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { findAndRunInterpreter, Interpretation } from '@/lib/interpreter'

export default function TxTable({ txs }: { txs: DecodedTransaction[] }) {
  const [result, setResult] = React.useState<Interpretation[]>([])

  React.useEffect(() => {
    async function run() {
      const withIntepretations = await Promise.all(
        txs.map((tx) => {
          return findAndRunInterpreter(tx)
        }),
      )

      setResult(withIntepretations)
    }
    run()
  }, [txs])

  return (
    <Table>
      <TableCaption>A list of recent transactions.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="">Age</TableHead>
          <TableHead>Link</TableHead>
          <TableHead>Interpretation</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {result.map(({ tx, interpretation }) => (
          <TableRow key={tx?.txHash}>
            <TableCell>{new Date(Number(tx?.timestamp + '000')).toUTCString()}</TableCell>
            <TableCell>
              <a href={`https://etherscan.io/tx/${tx?.txHash}`} target="_blank" rel="noreferrer">
                {tx?.txHash.slice(0, 6) + '...' + tx?.txHash.slice(-4)}
              </a>
            </TableCell>
            <TableCell>
              <pre>{typeof interpretation === 'string' ? interpretation : JSON.stringify(interpretation, null, 2)}</pre>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
