'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { DecodedTransaction } from '@3loop/transaction-decoder'
import CodeBlock from '@/components/ui/code-block'
import { NetworkSelect } from '@/components/ui/network-select'
import { ExampleTransactions } from '@/components/ui/examples'

interface FormProps {
  currentChainID: number
  decoded?: DecodedTransaction
  currentHash?: string
}

const PATH = 'decode'

export default function DecodingForm({ decoded, currentHash, currentChainID }: FormProps) {
  const router = useRouter()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const hash = (e.target as any).hash.value
    router.push(`/${PATH}/${currentChainID}/${hash}`)
  }

  return (
    <div className="grid h-full items-stretch gap-6 grid-cols-1 lg:grid-cols-[1fr_200px]">
      <div className="md:order-1 flex flex-col space-y-4">
        <form onSubmit={onSubmit}>
          <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row">
            <div>
              <NetworkSelect
                defaultValue={currentChainID.toString()}
                onValueChange={(value) => {
                  const hash = currentHash || ''
                  router.push(`/${PATH}/${value}/${hash}`)
                }}
              />
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
            </div>
          </div>
        </form>

        <div className="grid gap-6 h-full">
          <div className="flex flex-col gap-2  min-h-[40vh] lg:min-h-[initial]">
            <Label>Decoded transaction:</Label>
            <CodeBlock language="json" value={JSON.stringify(decoded, null, 2)} readonly={true} lineNumbers={false} />
          </div>
        </div>
      </div>

      <div className="md:order-2">
        <ExampleTransactions path={PATH} />
      </div>
    </div>
  )
}
