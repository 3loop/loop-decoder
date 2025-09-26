import { genericInterpreter } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = genericInterpreter(event)

  const userOpEvents = event.interactions.filter((e) => e.event.eventName === 'UserOperationEvent')

  if (newEvent.type !== 'unknown') {
    return newEvent
  }

  if (userOpEvents.length === 1) {
    const userOpEvent = userOpEvents[0]
    const { sender } = userOpEvent.event.params as {
      sender: string
    }

    // if there is only one userOpEvent, we can use the sender as the fromAddress
    // to try to use the generic interpreter to interpret the transaction
    return genericInterpreter({
      ...event,
      fromAddress: sender,
    })
  }

  if (userOpEvents.length > 1) {
    return {
      ...newEvent,
      type: 'account-abstraction',
      action: `Account Abstraction transaction by ${userOpEvents.length} addresses`,
    }
  }

  return newEvent
}

export const events = ['UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)']
