import { displayAsset, defaultEvent } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const methodName = event.methodCall.name

  const newEvent = defaultEvent(event)

  switch (methodName) {
    case 'repay':
    case 'repayWithPermit':
    case 'repayWithATokens':
      return {
        ...newEvent,
        type: 'repay-loan',
        action: 'User repaid ' + displayAsset(newEvent.assetsSent[0]),
      }

    case 'deposit':
    case 'supplyWithPermit':
    case 'supply':
      return {
        ...newEvent,
        type: 'deposit-collateral',
        action: 'User deposited ' + displayAsset(newEvent.assetsSent[0]),
      }

    case 'borrow':
      return {
        ...newEvent,
        type: 'borrow',
        action: 'User borrowed ' + displayAsset(newEvent.assetsReceived[0]),
      }

    case 'withdraw':
      return {
        ...newEvent,
        type: 'withdraw-collateral',
        action: 'User withdrew ' + displayAsset(newEvent.assetsReceived[0]),
      }

    case 'flashLoanSimple': {
      return {
        ...newEvent,
        type: 'unknown',
        action: 'Executed flash loan with ' + displayAsset(newEvent.assetsSent[0]),
      }
    }

    case 'setUserUseReserveAsCollateral': {
      const assetAddress = event.methodCall.params?.[0]?.value as string
      const enabled = event.methodCall.params?.[1]?.value === 'true'
      return {
        ...newEvent,
        type: 'unknown',
        action: `User ${enabled ? 'enabled' : 'disabled'} ${assetAddress} as collateral`,
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
