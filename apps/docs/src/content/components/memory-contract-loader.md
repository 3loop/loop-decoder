```ts title="index.ts"
import type { ContractData, VanillaContractMetaStore } from '@3loop/transaction-decoder'
import { ERC20RPCStrategyResolver } from '@3loop/transaction-decoder'

// Create an in-memory cache for the contract meta-information
const contractMetaCache = new Map<string, ContractData>()

const contractMetaStore: VanillaContractMetaStore = {
  // Define the strategies to use for fetching the contract meta-information
  strategies: [ERC20RPCStrategyResolver],

  // Get the contract meta-information from the cache
  get: async ({ address, chainID }) => {
    const key = `${address}-${chainID}`.toLowerCase()
    const value = contractMetaCache.get(key)

    if (value) {
      return {
        status: 'success',
        result: value,
      }
    }

    return {
      status: 'empty',
      result: null,
    }
  },

  // Set the contract meta-information in the cache
  set: async ({ address, chainID }, result) => {
    const key = `${address}-${chainID}`.toLowerCase()

    if (result.status === 'success') {
      contractMetaCache.set(key, result.result)
    }
  },
}
```
