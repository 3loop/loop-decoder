import { defaultEvent, displayAddress, formatNumber } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = defaultEvent(event)

  if (event.methodCall.name !== 'handleOps') {
    return newEvent
  }

  const userOpEvents = event.interactions.filter((e) => e.event.eventName === 'UserOperationEvent')
  const isBatch = userOpEvents.length > 1
  const fee = newEvent.assetsReceived[0]?.amount
  const sender = (userOpEvents[0].event.params as { sender: string }).sender

  return {
    ...newEvent,
    type: 'account-abstraction',
    action: `Account Abstraction transaction by ${
      isBatch ? userOpEvents.length + ' addresses' : displayAddress(sender)
    } with fee ${formatNumber(fee, 4)}`,
  }
}

export const contracts = ['1:0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789']
