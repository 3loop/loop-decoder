import { Effect, Layer } from 'effect'
import * as AbiStore from '../abi-store.js'
import { ContractABI } from '../abi-strategy/request-model.js'

// Keyed by composite: kind|key|source to allow per-strategy replacement
const abiCache = new Map<string, ContractABI>()

export const make = (strategies: AbiStore.AbiStore['strategies']) =>
  Layer.scoped(
    AbiStore.AbiStore,
    AbiStore.make({
      strategies,
      set: (_key, abi) =>
        Effect.sync(() => {
          const source = abi.source ?? 'unknown'
          if (abi.type === 'address') {
            abiCache.set(`addr|${abi.address}|${source}`.toLowerCase(), abi)
          } else if (abi.type === 'event') {
            abiCache.set(`event|${abi.event}|${source}`, abi)
          } else if (abi.type === 'func') {
            abiCache.set(`sig|${abi.signature}|${source}`, abi)
          }
        }),
      get: (key) =>
        Effect.sync(() => {
          const results: ContractABI[] = []

          // If a specific strategy is requested via mark on keys in future, we return union of all strategies for that key
          const prefixAddr = `addr|${key.address}|`.toLowerCase()
          const prefixSig = key.signature ? `sig|${key.signature}|` : undefined
          const prefixEvt = key.event ? `event|${key.event}|` : undefined

          for (const [k, v] of abiCache.entries()) {
            if (
              k.startsWith(prefixAddr) ||
              (prefixSig && k.startsWith(prefixSig)) ||
              (prefixEvt && k.startsWith(prefixEvt))
            ) {
              results.push(v)
            }
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
