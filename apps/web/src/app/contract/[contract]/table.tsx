'use client'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import React from 'react'
import { DecodedTx, Interpreter } from '@3loop/transaction-decoder'
import { findAndRunInterpreter, defaultInterpreters, Interpretation } from '@/lib/interpreter'

function getAvaliableinterpreters() {
  if (typeof window === 'undefined') return undefined

  let res: Interpreter[] = []

  for (const interpreter of defaultInterpreters) {
    const stored = window.localStorage.getItem(interpreter.id)
    if (stored) {
      const updatedSchema = JSON.parse(stored)

      res.push({
        ...interpreter,
        schema: updatedSchema,
      })
    } else {
      res.push(interpreter)
    }
  }

  return res
}

export default function TxTable({ txs }: { txs: DecodedTx[] }) {
  const [result, setResult] = React.useState<Interpretation[]>([])
  const [interpreters] = React.useState(getAvaliableinterpreters)

  React.useEffect(() => {
    async function run() {
      if (interpreters == null) return

      const withIntepretations = await Promise.all(
        txs.map((tx) => {
          return findAndRunInterpreter(tx, interpreters)
        }),
      )

      setResult(withIntepretations)
    }
    run()
  }, [interpreters, txs])

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
