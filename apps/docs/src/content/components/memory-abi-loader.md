```ts title="index.ts"
import {
  EtherscanStrategyResolver,
  FourByteStrategyResolver,
  VanillaAbiStore,
  ContractABI,
} from '@3loop/transaction-decoder'

// Create an in-memory cache for the ABIs
const abiCache = new Map<string, ContractABI>()

const abiStore: VanillaAbiStore = {
  // Define the strategies to use for fetching the ABIs
  strategies: [
    EtherscanStrategyResolver({
      apikey: 'YourApiKeyToken',
    }),
    FourByteStrategyResolver(),
  ],

  // Get the ABI from the cache
  // Get it by contract address, event name or signature hash
  get: async ({ address, event, signature }) => {
    const value = abiCache.get(address)
    if (value) {
      return {
        status: 'success',
        result: value,
      }
    } else if (event) {
      const value = abiCache.get(event)
      if (value) {
        return {
          status: 'success',
          result: value,
        }
      }
    } else if (signature) {
      const value = abiCache.get(signature)
      if (value) {
        return {
          status: 'success',
          result: value,
        }
      }
    }

    return {
      status: 'empty',
      result: null,
    }
  },

  // Set the ABI in the cache
  // Store it by contract address, event name or signature hash
  set: async (_key, value) => {
    if (value.status === 'success') {
      if (value.result.type === 'address') {
        abiCache.set(value.result.address, value.result)
      } else if (value.result.type === 'event') {
        abiCache.set(value.result.event, value.result)
      } else if (value.result.type === 'func') {
        abiCache.set(value.result.signature, value.result)
      }
    }
  },
}
```
