import { Address, isAddress, TransactionReceipt } from 'viem'
import traverse from 'traverse'
import type { DecodeResult, Interaction } from '../types.js'

export const collectAllAddresses = ({
  interactions,
  decodedData,
  receipt,
}: {
  interactions: Interaction[]
  decodedData?: DecodeResult
  receipt?: TransactionReceipt
}) => {
  const addresses = new Set<Address>()

  if (receipt?.from != null) {
    addresses.add(receipt.from)
  }

  if (receipt?.to != null) {
    addresses.add(receipt.to)
  }

  for (const interaction of interactions) {
    addresses.add(interaction.contractAddress)
    traverse(interaction.event).forEach(function (value: string) {
      if (this.isLeaf && isAddress(value)) {
        addresses.add(value)
      }
    })
  }

  if (decodedData?.params) {
    for (const param of decodedData.params) {
      if (typeof param.value === 'string' && isAddress(param.value)) {
        addresses.add(param.value)
      }
    }
  }

  return [...addresses]
}
