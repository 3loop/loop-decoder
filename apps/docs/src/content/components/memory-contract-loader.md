```ts title="src/decoder/decoder.ts"
import type { ContractData, VanillaContractMetaStore } from '@3loop/transaction-decoder'
import { ERC20RPCStrategyResolver } from '@3loop/transaction-decoder'

const contractMetaCache = new Map<string, ContractData>()

const contractMetaStore: VanillaContractMetaStore = {
  strategies: [ERC20RPCStrategyResolver],
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
  set: async ({ address, chainID }, result) => {
    const key = `${address}-${chainID}`.toLowerCase()

    if (result.status === 'success') {
      contractMetaCache.set(key, result.result)
    }
  },
}
```
