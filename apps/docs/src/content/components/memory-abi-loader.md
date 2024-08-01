```ts title="src/decoder/decoder.ts"
import {
  EtherscanStrategyResolver,
  FourByteStrategyResolver,
  VanillaAbiStore,
  ContractABI,
} from '@3loop/transaction-decoder'

const abiCache = new Map<string, ContractABI>()

const abiStore: VanillaAbiStore = {
  strategies: [
    EtherscanStrategyResolver({
      apikey: 'YourApiKeyToken',
    }),
    FourByteStrategyResolver(),
  ],
  get: async ({ address, event, signature }) => {
    const value = abiCache.get(address)
    if (value) {
      return {
        status: 'success',
        result: value,
      }
    } else if (event != null && value) {
      return {
        status: 'success',
        result: value,
      }
    } else if (signature != null && value) {
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
