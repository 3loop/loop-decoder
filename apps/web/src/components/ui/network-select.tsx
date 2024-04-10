'use client'
import * as React from 'react'
import { SelectProps } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams, useRouter } from 'next/navigation'
import { supportedChains } from '@/app/data'

export function NetworkSelect(props: SelectProps) {
  const router = useRouter()
  const params = useParams()

  const onValueChange = (newChainID: string) => {
    router.push(`/tx/${newChainID}`)
  }

  const chainID = (params.chainID as string) ?? props.defaultValue

  return (
    <Select onValueChange={onValueChange} value={chainID}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a network" />
      </SelectTrigger>
      <SelectContent>
        {supportedChains.map((chain) => (
          <SelectItem key={chain.chainID} value={chain.chainID.toString()}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
