import type { ContractData } from '../types.js'
import { ContractMetaStore } from '../effect.js'
import { Effect, Layer } from 'effect'

const contractMetaCache = new Map<string, ContractData>()

export const make = (strategies: ContractMetaStore['strategies']) =>
  Layer.succeed(
    ContractMetaStore,
    ContractMetaStore.of({
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
    }),
  )
