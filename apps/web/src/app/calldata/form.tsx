'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import CodeBlock from '@/components/ui/code-block'
import { NetworkSelect } from '@/components/ui/network-select'
import { Input } from '@/components/ui/input'
import { ExampleTransactions } from '../../components/ui/examples'
import { useCalldataForm } from './useCalldataForm'
import { CalldataFormProps } from './types'

const PATH = 'calldata'

export default function DecodingForm({ decoded, contractAddress, chainID, data, isLoading }: CalldataFormProps) {
  const { form, onSubmit } = useCalldataForm({
    data,
    chainID,
    contractAddress,
  })

  return (
    <div className="grid h-full items-stretch gap-6 grid-cols-1 lg:grid-cols-[1fr_200px]">
      <div className="md:order-1 flex flex-col space-y-4">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full gap-2 flex-col">
            <Textarea
              className="min-h-[100px] flex-1"
              placeholder="Paste transaction calldata or click on examples"
              {...form.register('data', { required: true })}
            />
            <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row">
              <div>
                <NetworkSelect
                  defaultValue={form.watch('chainID')}
                  onValueChange={(value) => {
                    form.setValue('chainID', value)
                  }}
                />
              </div>
              <Input
                className="flex-1"
                placeholder="Optional: contract address"
                defaultValue={contractAddress}
                {...form.register('contractAddress')}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Decoding...' : 'Decode'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {decoded && (
          <div className="grid gap-6 h-full">
            <div className="flex flex-col gap-2 min-h-[40vh] lg:min-h-[initial]">
              <Label>Decoded calldata:</Label>
              <CodeBlock language="json" value={JSON.stringify(decoded, null, 2)} readonly lineNumbers={false} />
            </div>
          </div>
        )}
      </div>

      <div className="md:order-2">
        <ExampleTransactions path={PATH} />
      </div>
    </div>
  )
}
