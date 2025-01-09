import fs from 'node:fs'
import { createPublicClient, http } from 'viem'
import { RPC } from '../constants.js'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

async function createMock(hash, rpcUrl) {
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  })

  const [receipt, transaction, trace] = await Promise.all([
    publicClient.request({ method: 'eth_getTransactionReceipt', params: [hash] }),
    publicClient.request({ method: 'eth_getTransactionByHash', params: [hash] }),
    publicClient.request({ method: 'trace_transaction', params: [hash] }),
  ])

  if (transaction == null) return

  const block = transaction.blockNumber
    ? await publicClient.request({ method: 'eth_getBlockByNumber', params: [transaction.blockNumber, true] })
    : undefined

  return {
    receipt,
    transaction,
    trace,
    block,
  }
}

async function main() {
  const hash = process.argv[2]
  const rpcUrl = process.argv[3] ?? RPC

  if (hash == null) {
    console.log('Please provide a transaction hash')
    return
  }

  const mock = await createMock(hash, rpcUrl)

  if (mock == null) return

  if (mock.block != null) {
    fs.writeFileSync(
      `./test/mocks/tx/${Number(mock.transaction.blockNumber).toString()}.json`,
      JSON.stringify(mock.block, null, 2),
    )
  }

  delete mock.block

  fs.writeFileSync(`./test/mocks/tx/${hash.toLowerCase()}.json`, JSON.stringify(mock, null, 2))
}

main()
