```ts title="index.ts"
import type { ContractData, VanillaContractMetaStore } from '@3loop/transaction-decoder'
import { ERC20RPCStrategyResolver } from '@3loop/transaction-decoder'

// Create an in-memory cache for the contract meta-information
const contractMetaCache = new Map<string, ContractData>()

// Contract metadata store implementation with in-memory caching
const contractMetaStore: VanillaContractMetaStore = {
  strategies: [ERC20RPCStrategyResolver],

  get: async ({ address, chainID }) => {
    const key = `${address}-${chainID}`.toLowerCase()
    const cached = contractMetaCache.get(key)
    return cached ? { status: 'success', result: cached } : { status: 'empty', result: null }
  },

  set: async ({ address, chainID }, result) => {
    if (result.status === 'success') {
      contractMetaCache.set(`${address}-${chainID}`.toLowerCase(), result.result)
    }
  },
}
```
