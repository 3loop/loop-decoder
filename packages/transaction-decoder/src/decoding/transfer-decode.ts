import { formatEther, type TransactionReceipt, type GetTransactionReturnType } from 'viem'
import type { DecodedTx } from '../types.js'
import { TxType } from '../types.js'

export function transferDecode({
  transaction,
  receipt,
}: {
  transaction: GetTransactionReturnType
  receipt: TransactionReceipt
}): DecodedTx {
  const value = transaction.value.toString()
  const effectiveGasPrice = receipt.effectiveGasPrice ?? BigInt(0)
  const gasPaid = formatEther(receipt.gasUsed * effectiveGasPrice)

  const decodedTx: DecodedTx = {
    contractName: null,
    contractType: 'OTHER',
    txHash: transaction.hash,
    txType: TxType.TRANSFER,
    fromAddress: receipt.from,
    toAddress: receipt.to,
    methodCall: {
      name: 'Transfer',
      arguments: [],
    },
    traceCalls: [],
    nativeValueSent: value,
    chainSymbol: 'ETH',
    interactions: [],
    chainID: Number(transaction.chainId),
    effectiveGasPrice: receipt.effectiveGasPrice?.toString() ?? transaction.gasPrice?.toString() ?? null,
    gasUsed: receipt.gasUsed.toString(),
    gasPaid,
    timestamp: 0,
    txIndex: receipt.transactionIndex,
    reverted: receipt.status === 'reverted', // will return true if status==undefined
    transfers: [], // TDOO: display the eth sent
    interactedAddresses: [receipt.from, receipt.to].filter(Boolean),
    errors: null, //TODO: add error decoding
  }

  return decodedTx
}
