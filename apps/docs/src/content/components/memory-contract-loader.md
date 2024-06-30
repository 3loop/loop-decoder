```ts title="src/decoder/decoder.ts"
import type { ContractData } from '@3loop/transaction-decoder'
import { ERC20RPCStrategyResolver } from '@3loop/transaction-decoder'

const contractMetaCache = new Map<string, ContractData>()

const contractMetaStore: VanillaContractMetaStore = {
  strategies: [ERC20RPCStrategyResolver],
  get: async ({ address, chainID }) => {
    const key = `${address}-${chainID}`.toLowerCase()

    if (contractMetaCache.has(key)) {
      return {
        status: 'success',
        result: contractMetaCache.get(key),
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
