import { formatEther, type TransactionReceipt, type TransactionResponse } from 'ethers'
import type { DecodedTx } from '../types.js'
import { TxType } from '../types.js'

export function transferDecode({
    transaction,
    receipt,
}: {
    transaction: TransactionResponse
    receipt: TransactionReceipt
}): DecodedTx {
    const value = transaction.value.toString()
    const effectiveGasPrice = receipt.gasPrice ?? BigInt(0)
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
        effectiveGasPrice: receipt.gasPrice?.toString() ?? transaction.gasPrice.toString() ?? null,
        gasUsed: receipt.gasUsed.toString(),
        gasPaid,
        timestamp: 0,
        txIndex: receipt.index,
        reverted: receipt.status === 0, // will return true if status==undefined
        assetsReceived: [],
        assetsSent: [], // TDOO: display the eth sent
    }

    return decodedTx
}
