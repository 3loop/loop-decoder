import { Effect, Layer } from 'effect'
import * as AbiStore from '../abi-store.js'
import { ContractABI } from '../abi-strategy/request-model.js'

const abiCache = new Map<string, ContractABI>()

export const make = (strategies: AbiStore.AbiStore['strategies']) =>
  Layer.scoped(
    AbiStore.AbiStore,
    AbiStore.make({
      strategies,
      set: (_key, value) =>
        Effect.sync(() => {
          for (const abi of value) {
            if (abi.type === 'address') {
              abiCache.set(abi.address, abi)
            } else if (abi.type === 'event') {
              abiCache.set(abi.event, abi)
            } else if (abi.type === 'func') {
              abiCache.set(abi.signature, abi)
            }
          }
        }),
      get: (key) =>
        Effect.sync(() => {
          const results: ContractABI[] = []

          // Collect all matching ABIs
          if (abiCache.has(key.address)) {
            results.push(abiCache.get(key.address)!)
          }

          if (key.event && abiCache.has(key.event)) {
            results.push(abiCache.get(key.event)!)
          }

          if (key.signature && abiCache.has(key.signature)) {
            results.push(abiCache.get(key.signature)!)
          }

          return results
        }),
      updateStatus: (id, status) =>
        Effect.sync(() => {
          // For in-memory store, we need to find the ABI by ID and update its status
          // Since we don't have ID-based lookup in memory, we'll iterate through cache
          for (const [key, abi] of abiCache.entries()) {
            if (abi.id === id) {
              // Create a new ABI object with updated status
              // Note: For in-memory, we can't actually change the status of the result
              // since it's used in ContractAbiResult. This is a limitation of the in-memory approach.
              // In practice, you'd want to remove invalid ABIs from cache or mark them differently.
              abiCache.delete(key)
              break
            }
          }
        }),
    }),
  )
