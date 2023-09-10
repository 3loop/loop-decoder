import { JsonRpcProvider } from 'ethers'
import fs from 'fs'

const GOERLI_RPC = 'https://rpc.ankr.com/eth_goerli'

async function createMock(hash: string, rpcUrl: string) {
    const provider = new JsonRpcProvider(rpcUrl)

    const [receipt, transaction, trace] = await Promise.all([
        provider.getTransactionReceipt(hash),
        provider.getTransaction(hash),
        provider.send('trace_transaction', [hash]),
    ])

    if (transaction == null) return

    const block = await provider.getBlock(transaction.blockNumber!)

    return {
        receipt,
        transaction,
        trace,
        block,
    }
}

async function main() {
    const hash = process.argv[2]
    const rpcUrl = process.argv[3] ?? GOERLI_RPC

    if (hash == null) {
        console.log('Please provide a transaction hash')
        return
    }

    const mock = await createMock(hash, rpcUrl)

    if (mock == null) return

    fs.writeFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`, JSON.stringify(mock, null, 2))

    if (mock.block != null) {
        fs.writeFileSync(`./test/mocks/tx/${mock.transaction.blockNumber}.json`, JSON.stringify(mock.block, null, 2))
    }
}

main()
