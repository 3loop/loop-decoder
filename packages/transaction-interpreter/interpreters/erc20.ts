import { assetsReceived, assetsSent, formatNumber, genericInterpreter, displayAsset } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = genericInterpreter(event)

  switch (methodName) {
    case 'approve': {
      const approval = event.interactions.find((i) => i.event.eventName === 'Approval')
      const approvalValue = (event.methodCall?.params?.[1]?.value || '') as string
      const name = approval?.contractSymbol || event.contractName || 'unknown'
      let action = ''

      const isUnlimitedApproval = (value: string) => value.startsWith('11579208923731619542357098')
      const isRevokedApproval = (value: string) => value === '0'
      const formatAmount = (value: string, decimals: number) =>
        (BigInt(value) / BigInt(10 ** decimals)).toString() + ' '

      if (approvalValue) {
        if (isUnlimitedApproval(approvalValue)) {
          action = `Approved unlimited amount of ${name} to be spent`
        } else if (isRevokedApproval(approvalValue)) {
          action = `Revoked approval for ${name} to be spent`
        } else {
          const amount = formatAmount(approvalValue, approval?.decimals || 18)
          action = `Approved ${formatNumber(amount)} ${name} to be spent`
        }
      }

      return {
        ...newEvent,
        type: 'approve-token',
        action,
      }
    }
    case 'transfer': {
      return {
        ...newEvent,
        type: 'transfer-token',
        action: `Sent ${displayAsset(newEvent.assetsSent[0])}`,
      }
    }
    case 'transferFrom': {
      const from = event.methodCall?.params?.[0]?.value as string
      const amount = event.transfers[0]?.amount || event.methodCall?.params?.[2]?.value || '0'
      const symbol = event.transfers[0]?.symbol || event.contractName || 'unknown'

      if (!from) break

      return {
        ...newEvent,
        type: 'transfer-token',
        action: `Sent ${formatNumber(amount.toString())} ${symbol}`,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
  }

  return newEvent
}

export const contractType = 'erc20'
