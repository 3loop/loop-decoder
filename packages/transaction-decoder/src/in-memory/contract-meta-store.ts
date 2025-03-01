import type { ContractData } from '../types.js'
import * as ContractMetaStore from '../contract-meta-store.js'
import { Effect } from 'effect'

const contractMetaCache = new Map<string, ContractData>()

export const make = (strategies: ContractMetaStore.ContractMetaStore['strategies']) =>
  ContractMetaStore.layer({
    strategies,
    get: ({ address, chainID }) =>
      Effect.sync(() => {
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
      }),
    set: ({ address, chainID }, result) =>
      Effect.sync(() => {
        const key = `${address}-${chainID}`.toLowerCase()

        if (result.status === 'success') {
          contractMetaCache.set(key, result.result)
        }
      }),
  })
