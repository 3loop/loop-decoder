import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { assetsSent, assetsReceived, genericInterpreter } from './std.js'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const newEvent = genericInterpreter(event)
  const methodName = event.methodCall?.name
  const safeMultisigEvent = event.interactions.find((i) => i.event.eventName === 'SafeMultiSigTransaction')
  const successEvents = event.interactions.filter((i) => i.event.eventName === 'ExecutionSuccess')

  if (newEvent.type !== 'unknown') {
    return newEvent
  }

  // executed single transaction
  if (safeMultisigEvent && successEvents.length === 1) {
    const safeAddress = event.toAddress ?? ''
    const action = (event.methodCall?.params?.find((p) => p.name === 'data') as { valueDecoded: any | undefined })
      ?.valueDecoded

    if (action?.name === 'multiSend') {
      const txs = action?.params?.[0]?.valueDecoded?.params?.[0]?.components
      return {
        ...newEvent,
        action: 'Executed ' + (txs?.length ? txs?.length + ' transactions' : 'transaction') + ' from Safe Wallet',
        type: txs?.length ? 'batch' : newEvent.type,
        assetsSent: assetsSent(event.transfers, safeAddress),
        assetsReceived: assetsReceived(event.transfers, safeAddress),
      }
    }

    return {
      ...newEvent,
      action: `Called method '${action?.name ?? methodName}' from Safe Wallet`,
      assetsSent: assetsSent(event.transfers, safeAddress),
      assetsReceived: assetsReceived(event.transfers, safeAddress),
    }
  }

  // bult transactions
  if (methodName === 'multiSend' && successEvents.length > 0) {
    const safeAddress = successEvents[0].contractAddress ?? ''

    return {
      ...newEvent,
      action: 'Executed ' + successEvents.length + ' transactions from Safe Wallet',
      type: 'batch',
      assetsSent: assetsSent(event.transfers, safeAddress),
      assetsReceived: assetsReceived(event.transfers, safeAddress),
    }
  }

  return newEvent
}

export const events = [
  'ExecutionSuccess(bytes32,uint256)',
  'ExecutionFailure(bytes32,uint256)',
  'SafeMultiSigTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes,bytes)',
]
