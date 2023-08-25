import type { TransactionReceipt, TransactionResponse } from 'ethers'
import type { DecodedTx } from '../types.js'
import { ContractType, TxType } from '../types.js'

export function transferDecode({
    transaction,
    receipt,
}: {
    transaction: TransactionResponse
    receipt: TransactionReceipt
}): DecodedTx {
    const value = transaction.value.toString()
    const decodedTx: DecodedTx = {
        contractName: null,
        contractType: ContractType.OTHER,
        officialContractName: null,
        allAddresses: [],
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
        effectiveGasPrice: receipt.gasPrice.toString() || transaction.gasPrice.toString() || null,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: 0,
        txIndex: receipt.index,
        reverted: receipt.status === 0, // will return true if status==undefined
    }

    return decodedTx
}
