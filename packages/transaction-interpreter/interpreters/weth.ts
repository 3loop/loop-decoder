import { defaultEvent, displayAsset, formatNumber } from './std.js'
import type { InterpretedTransaction } from '@/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  const methodName = event.methodCall.name
  const newEvent = defaultEvent(event)

  switch (methodName) {
    case 'deposit':
      return {
        ...newEvent,
        type: 'wrap',
        action: `Wrapped ${displayAsset(newEvent.assetsSent[0])}`,
      }
    case 'withdraw':
      return {
        ...newEvent,
        type: 'unwrap',
        action: `Unwrapped ${displayAsset(newEvent.assetsReceived[0])}`,
      }
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
    case 'transfer':
      return {
        ...newEvent,
        type: 'transfer-token',
        action: `Sent ${displayAsset(newEvent.assetsSent[0])}`,
      }
  }

  return newEvent
}

export const contracts = [
  '1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '8453:0x4200000000000000000000000000000000000006',
]
