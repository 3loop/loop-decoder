import { assetsReceived, assetsSent } from './std.js'
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

  switch (methodName) {
    case 'approve': {
      const approval = event.interactions.find((i) => i.event.eventName === 'Approval')
      const approvalValue = (event.methodCall?.arguments?.[1]?.value || '') as string
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
          action = `Approved ${amount}${name} to be spent`
        }
      }

      return {
        type: 'approve-token',
        action,
        ...newEvent,
      }
    }
    case 'transfer': {
      const amount = newEvent.assetsSent?.[0]?.amount || event.methodCall?.arguments?.[1]?.value
      const symbol = newEvent.assetsSent?.[0]?.asset?.symbol || event.contractName || 'unknown'

      return {
        type: 'transfer-token',
        action: `Sent ${amount} ${symbol}`,
        ...newEvent,
      }
    }
    case 'transferFrom': {
      const from = event.methodCall?.arguments?.[0]?.value as string
      const amount = event.transfers[0]?.amount || event.methodCall?.arguments?.[2]?.value
      const symbol = event.transfers[0]?.symbol || event.contractName || 'unknown'

      if (!from) break

      return {
        type: 'transfer-token',
        action: `Sent ${amount} ${symbol}`,
        ...newEvent,
        assetsSent: assetsSent(event.transfers, from),
        assetsReceived: assetsReceived(event.transfers, from),
      }
    }
  }

  return {
    type: 'unknown',
    action: `Called method '${methodName}'`,
    ...newEvent,
  }
}

export const contractType = 'erc20'
