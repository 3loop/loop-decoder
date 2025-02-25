import { Address, getAddress, isAddress, TransactionReceipt } from 'viem'
import type { DecodeResult, Interaction } from '../types.js'
import traverse from '../helpers/traverse.js'

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
    addresses.add(getAddress(receipt.from))
  }

  if (receipt?.to != null) {
    addresses.add(getAddress(receipt.to))
  }

  for (const interaction of interactions) {
    addresses.add(interaction.contractAddress)
    traverse(interaction.event).forEach((value: string, _path: string[], isLeaf: boolean) => {
      if (isLeaf && isAddress(value)) {
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
