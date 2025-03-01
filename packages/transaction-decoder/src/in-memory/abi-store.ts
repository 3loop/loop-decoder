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
          if (value.status === 'success') {
            if (value.result.type === 'address') {
              abiCache.set(value.result.address, value.result)
            } else if (value.result.type === 'event') {
              abiCache.set(value.result.event, value.result)
            } else if (value.result.type === 'func') {
              abiCache.set(value.result.signature, value.result)
            }
          }
        }),
      get: (key) =>
        Effect.sync(() => {
          if (abiCache.has(key.address)) {
            return {
              status: 'success',
              result: abiCache.get(key.address)!,
            }
          }

          if (key.event && abiCache.has(key.event)) {
            return {
              status: 'success',
              result: abiCache.get(key.event)!,
            }
          }

          if (key.signature && abiCache.has(key.signature)) {
            return {
              status: 'success',
              result: abiCache.get(key.signature)!,
            }
          }

          return {
            status: 'empty',
            result: null,
          }
        }),
    }),
  )
