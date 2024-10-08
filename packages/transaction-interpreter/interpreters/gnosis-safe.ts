import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'
import { assetsSent, displayAsset, defaultEvent, filterZeroTransfers } from './std.js'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const newEvent = defaultEvent(event)
  const safeEvent = event.interactions.find((interaction) => interaction.event.eventName === 'SafeMultiSigTransaction')

  if (safeEvent) {
    const { to, value, data } = safeEvent.event.params as {
      to: string
      value: string
      data: string
    }
  }

  return newEvent
}

export const events = [
  'SafeMultiSigTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes,bytes)',
]
