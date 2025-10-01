```ts title="index.ts"
import {
  EtherscanStrategyResolver,
  FourByteStrategyResolver,
  VanillaAbiStore,
  ContractABI,
} from '@3loop/transaction-decoder'

// Create an in-memory cache for the ABIs
const abiCache = new Map<string, ContractABI>()

// ABI store implementation with caching and multiple resolution strategies
const abiStore: VanillaAbiStore = {
  strategies: [
    // List of stratagies to resolve new ABIs
    EtherscanV2StrategyResolver({
      apikey: process.env.ETHERSCAN_API_KEY || '',
    }),
    FourByteStrategyResolver(),
  ],

  // Get ABI from memory by address, event or signature
  // Can be returned the list of all possible ABIs
  get: async ({ address, event, signature }) => {
    const key = address?.toLowerCase() || event || signature
    if (!key) return []

    const cached = abiCache.get(key)
    return cached
      ? [
          {
            ...cached,
            id: key,
            source: 'etherscan',
            status: 'success',
          },
        ]
      : []
  },

  set: async (_key, abi) => {
    const key =
      abi.type === 'address'
        ? abi.address.toLowerCase()
        : abi.type === 'event'
        ? abi.event
        : abi.type === 'func'
        ? abi.signature
        : null

    if (key) abiCache.set(key, abi)
  },
}
```
