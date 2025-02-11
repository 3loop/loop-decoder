import {
  ERC20RPCStrategyResolver,
  ProxyRPCStrategyResolver,
  PublicClient,
  TransactionDecoder,
} from '@3loop/transaction-decoder'
import { createPublicClient, http } from 'viem'
import { InMemoryAbiStoreLive, InMemoryContractMetaStoreLive } from '@3loop/transaction-decoder/in-memory'
import { EtherscanV2StrategyResolver } from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'

/*
 * Example of decoding a transaction by hash
 * This example uses the default in-memory data loaders for ABIs and Contracts metadata: InMemoryAbiStoreLive and InMemoryContractMetaStoreLive
 */

// Create a public client for the Ethereum Mainnet network
const getPublicClient = (chainId: number) => {
  if (chainId === 1) {
    return {
      client: createPublicClient({
        transport: http('https://rpc.ankr.com/eth'),
      }),
    }
  }
}

const contractMetaStore = Layer.unwrapEffect(
  Effect.gen(function* () {
    const service = yield* PublicClient

    return InMemoryContractMetaStoreLive.make({
      default: [ERC20RPCStrategyResolver(service), ProxyRPCStrategyResolver(service)],
    })
  }),
)

const abiStore = InMemoryAbiStoreLive.make({
  default: [
    EtherscanV2StrategyResolver({
      apikey: 'YourApiKey', // provide Etherscan V2 API key
    }),
  ],
})

const decoder = new TransactionDecoder({
  getPublicClient: getPublicClient,
  abiStore,
  contractMetaStore,
})

export async function main({ hash }: { hash: string }): Promise<string | null> {
  try {
    const decoded = await decoder.decodeTransaction({
      chainID: 1,
      hash: hash,
    })

    return JSON.stringify(decoded, null, 2)
  } catch (e) {
    console.error(JSON.stringify(e, null, 2))
    return null
  }
}
