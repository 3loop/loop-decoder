import { InterpretedTransaction } from '@/types.js'
import { DecodedTx } from '@3loop/transaction-decoder'
import { assetsReceived, assetsSent, displayAddress, formatNumber } from './std.js'

export function transformEvent(event: DecodedTx): InterpretedTransaction {
  const methodName = event.methodCall.name

  const newEvent: Omit<InterpretedTransaction, 'action' | 'type'> = {
    chain: event.chainID,
    txHash: event.txHash,
    user: { address: event.fromAddress, name: null },
    method: methodName,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
  }

  if (event.methodCall.name !== 'handleOps') return { type: 'unknown', action: 'Unknown action', ...newEvent }

  const userOpEvents = event.interactions.filter((e) => e.event.eventName === 'UserOperationEvent')
  const isBatch = userOpEvents.length > 1
  const fee = newEvent.assetsReceived[0]?.amount
  const sender = (userOpEvents[0].event.params as { sender: string }).sender

  return {
    type: 'account-abstraction',
    action: `Account Abstraction transaction by ${
      isBatch ? userOpEvents.length + ' adresses' : displayAddress(sender)
    } with fee ${formatNumber(fee, 4)}`,
    ...newEvent,
  }
}

export const contracts = ['1:0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789']
