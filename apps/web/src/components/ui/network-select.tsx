'use client'
import * as React from 'react'
import { SelectProps } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { supportedChains } from '@/app/data'

interface NetworkSelectProps extends SelectProps {
  onValueChange?: (chainId: string) => void
}

export function NetworkSelect({ onValueChange, ...props }: NetworkSelectProps) {
  const params = useParams()
  const chainID = (params.chainID as string) ?? props.defaultValue

  return (
    <Select onValueChange={onValueChange} value={chainID}>
      <SelectTrigger className="min-w-[180px]">
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
