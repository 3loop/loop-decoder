'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { DEFAULT_CHAIN_ID, transactions } from '../../../data'
import { useLocalStorage } from 'usehooks-ts'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { PlayIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { DecodedTx, Interpreter } from '@3loop/transaction-decoder'
import { Interpretation, interpretTx } from '@/lib/interpreter'
import CodeBlock from '@/components/ui/code-block'
import { NetworkSelect } from '@/components/ui/network-select'

export const sidebarNavItems = transactions.map((tx) => {
  return {
    href: `/tx/${tx.chainID}/${tx.hash}`,
    title: `${tx.name} tx ${tx.hash.slice(0, 6)}...`,
  }
})

interface FormProps {
  currentChainID: number
  decoded?: DecodedTx
  defaultInterpreter?: Interpreter
  currentHash?: string
}

export default function DecodingForm({ decoded, defaultInterpreter, currentHash, currentChainID }: FormProps) {
  const [result, setResult] = React.useState<Interpretation>()
  const [schema, setSchema] = useLocalStorage(defaultInterpreter?.id ?? 'unknown', defaultInterpreter?.schema)

  const router = useRouter()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const hash = (e.target as any).hash.value
    router.push(`/tx/${currentChainID}/${hash}`)
  }

  const onRun = React.useCallback(() => {
    if (schema && defaultInterpreter != null && decoded != null) {
      const newInterpreter = {
        ...defaultInterpreter,
        schema: schema,
      }

      interpretTx(decoded, newInterpreter).then((res) => {
        setResult(res)
      })
    }
  }, [schema, decoded, defaultInterpreter])

  // Run the interpreter on page load
  React.useEffect(() => {
    if (schema && defaultInterpreter != null && decoded != null && result == null) {
      onRun()
    }
  }, [schema, decoded, defaultInterpreter, result, onRun])

  return (
    <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px]">
      <div className="md:order-1 flex flex-col space-y-4">
        <form onSubmit={onSubmit}>
          <div className="flex w-full items-center space-x-2">
            <NetworkSelect defaultValue={DEFAULT_CHAIN_ID.toString()} />

            <Input
              className="flex-1 flex"
              id="hash"
              name="hash"
              placeholder={`Paste Ethereum transaction hash or click on examples`}
              defaultValue={currentHash}
            />
            <Button type="submit">Decode</Button>
            <Button variant={'outline'} onClick={onRun} type="button">
              <PlayIcon className="mr-2 h-4 w-4" />
              Interpret
            </Button>
          </div>
        </form>

        <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-2 h-full">
          <div className="flex flex-col gap-2 col-span-2">
            <Label>Interpretation:</Label>

            <CodeBlock
              language="javascript"
              value={schema}
              onChange={(value) => setSchema(value)}
              lineNumbers={true}
              readonly={false}
            />
          </div>

          <div className="flex flex-col gap-2 ">
            <Label>Decoded transaction:</Label>
            <CodeBlock language="json" value={JSON.stringify(decoded, null, 2)} readonly={true} lineNumbers={false} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center">
              <Label>Result:</Label>
            </div>

            <CodeBlock
              language="json"
              value={result?.error ? result?.error : JSON.stringify(result?.interpretation, null, 2)}
              readonly={true}
              lineNumbers={false}
            />
          </div>
        </div>
      </div>

      <div className=" md:order-2">
        <div className="space-y-4">
          <div className="pl-4">
            <h2 className="text-lg font-semibold tracking-tight">AAVE V2</h2>
            <p className="text-sm text-muted-foreground">Example Transactions</p>
          </div>
          <SidebarNav items={sidebarNavItems} />
        </div>
      </div>
    </div>
  )
}
