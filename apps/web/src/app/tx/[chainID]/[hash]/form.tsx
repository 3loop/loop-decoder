'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { DEFAULT_CHAIN_ID, sidebarNavItems } from '@/app/data'
import { useLocalStorage } from 'usehooks-ts'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { PlayIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { DecodedTx } from '@3loop/transaction-decoder'
import { Interpretation, applyInterpreter } from '@/lib/interpreter'
import CodeBlock from '@/components/ui/code-block'
import { NetworkSelect } from '@/components/ui/network-select'
import { Interpreter } from '@3loop/transaction-interpreter'

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

      applyInterpreter(decoded, newInterpreter).then((res) => {
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
    <div className="grid h-full items-stretch gap-6 grid-cols-1 lg:grid-cols-[1fr_200px]">
      <div className="md:order-1 flex flex-col space-y-4">
        <form onSubmit={onSubmit}>
          <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row">
            <div>
              <NetworkSelect defaultValue={DEFAULT_CHAIN_ID.toString()} />
            </div>
            <Input
              className="flex-1"
              id="hash"
              name="hash"
              placeholder={`Paste Ethereum transaction hash or click on examples`}
              defaultValue={currentHash}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Decode
              </Button>
              <Button variant={'outline'} onClick={onRun} type="button" className="flex-1">
                <PlayIcon className="mr-2 h-4 w-4" />
                Interpret
              </Button>
            </div>
          </div>
        </form>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 h-full">
          <div className="flex flex-col gap-2 lg:col-span-2 min-h-[40vh] lg:min-h-[initial]">
            <Label>Interpretation:</Label>

            <CodeBlock
              language="javascript"
              value={schema}
              onChange={(value) => setSchema(value)}
              lineNumbers={true}
              readonly={false}
            />
          </div>

          <div className="flex flex-col gap-2  min-h-[40vh] lg:min-h-[initial]">
            <Label>Decoded transaction:</Label>
            <CodeBlock language="json" value={JSON.stringify(decoded, null, 2)} readonly={true} lineNumbers={false} />
          </div>

          <div className="flex flex-col gap-2  min-h-[40vh] lg:min-h-[initial]">
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

      <div className="md:order-2">
        <div className="space-y-4">
          <p className="text-lg font-semibold tracking-tight">Example Transactions</p>

          {Object.entries(sidebarNavItems).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-sm text-muted-foreground">{heading}</p>
              <SidebarNav items={items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
