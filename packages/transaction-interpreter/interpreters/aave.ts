import { assetsReceived, assetsSent, displayAsset, NULL_ADDRESS } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTx } from '@3loop/transaction-decoder'

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

  const directSent = newEvent.assetsSent.filter((a) => a.from.address !== NULL_ADDRESS && a.to.address !== NULL_ADDRESS)
  const directReceived = newEvent.assetsReceived.filter(
    (a) => a.from.address !== NULL_ADDRESS && a.to.address !== NULL_ADDRESS,
  )

  switch (methodName) {
    case 'repay':
    case 'repayWithPermit':
    case 'repayWithATokens':
      return {
        type: 'repay-loan',
        action: 'User repaid ' + displayAsset(directSent[0]),
        ...newEvent,
      }

    case 'deposit':
    case 'supplyWithPermit':
    case 'supply':
      return {
        type: 'deposit-collateral',
        action: 'User deposited ' + displayAsset(directSent[0]),
        ...newEvent,
      }

    case 'borrow':
      return {
        type: 'borrow',
        action: 'User borrowed ' + displayAsset(directReceived[0]),
        ...newEvent,
      }

    case 'withdraw':
      return {
        type: 'withdraw-collateral',
        action: 'User withdrew ' + displayAsset(directReceived[0]),
        ...newEvent,
      }

    case 'flashLoanSimple': {
      return {
        type: 'unknown',
        action: 'Executed flash loan with ' + displayAsset(directSent[0]),
        ...newEvent,
      }
    }

    case 'setUserUseReserveAsCollateral': {
      const assetAddress = event.methodCall.arguments[0].value as string
      const enabled = event.methodCall.arguments[1].value === 'true'
      return {
        type: 'set-user-use-reserve-as-collateral',
        action: `User ${enabled ? 'enabled' : 'disabled'} ${assetAddress} as collateral`,
        ...newEvent,
      }
    }
  }

  return {
    ...newEvent,
    type: 'unknown',
    action: 'Unknown action',
  }
}

export const contracts = [
  '1:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9', // Aave v2
  '1:0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', // Aave v3
]
