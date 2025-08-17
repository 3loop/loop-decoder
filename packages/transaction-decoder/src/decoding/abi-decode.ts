import { formatAbiItem } from 'viem/utils'
import type { DecodeResult, MostTypes, TreeNode } from '../types.js'
import {
  Hex,
  Abi,
  decodeFunctionData,
  decodeEventLog as viemDecodeEventLog,
  AbiParameter,
  AbiFunction,
  getAbiItem,
} from 'viem'
import { Data, Effect } from 'effect'
import { messageFromUnknown } from '../helpers/error.js'
import * as AbiStore from '../abi-store.js'
import { getAndCacheAbi } from '../abi-loader.js'

export class DecodeError extends Data.TaggedError('DecodeError')<{ message: string }> {
  constructor(message: string, error?: unknown) {
    super({ message: `${message} ${messageFromUnknown(error)}` })
  }
}

function stringifyValue(value: MostTypes): string | string[] {
  if (Array.isArray(value)) {
    return value.map((v) => v.toString())
  }

  return value?.toString() ?? ''
}

function getArrayComponents(type: string): [length: number | null, innerType: string] | undefined {
  const matches = type.match(/^(.*)\[(\d+)?\]$/)
  return matches ? [matches[2] ? Number(matches[2]) : null, matches[1]] : undefined
}

function attachValues<P extends readonly AbiParameter[]>(components: P, decoded: any): TreeNode[] {
  return components.map((input, index): TreeNode => {
    const arrayComponents = getArrayComponents(input.type)
    const value = Array.isArray(decoded) ? decoded[index] : decoded[input.name ?? '']

    if (arrayComponents && 'components' in input) {
      const [, innerType] = arrayComponents

      if (Array.isArray(value)) {
        return {
          name: input.name ?? 'unknown',
          type: innerType,
          components: value.map((val) => {
            return {
              name: input.name ?? 'unknown',
              type: innerType,
              components: attachValues(input.components, val),
            }
          }),
        }
      }

      return {
        name: input.name ?? 'unknown',
        type: innerType,
        components: attachValues(input.components, value),
      }
    }

    if (input.type === 'tuple' && 'components' in input) {
      return {
        name: input.name ?? 'unknown',
        type: input.type,
        components: attachValues(input.components, value),
      }
    }

    return {
      name: input.name ?? 'unknown',
      type: input.type,
      value: value != null ? stringifyValue(value) : '',
    }
  })
}

export const decodeMethod = (data: Hex, abi: Abi): Effect.Effect<DecodeResult | undefined, DecodeError> =>
  Effect.gen(function* () {
    const { functionName, args = [] } = yield* Effect.try({
      try: () => decodeFunctionData({ abi, data }),
      catch: (error) => new DecodeError(`Could not decode function data`, error),
    })

    const method = getAbiItem({ abi, name: functionName, args }) as AbiFunction | undefined

    if (method != null) {
      const signature = yield* Effect.try({
        try: () => formatAbiItem(method),
        catch: (error) => new DecodeError(`Could not format function data`, error),
      })

      const paramsTree = attachValues(method.inputs, args)

      return {
        name: functionName,
        signature,
        type: 'function',
        params: paramsTree,
      }
    }
  })

/**
 * Validates and decodes data using multiple ABIs with fallback support.
 * Tries each ABI in sequence and marks failed ABIs as invalid in the store.
 * Uses Effect.firstSuccessOf to return the first successful decode result.
 */
export const validateAndDecodeWithABIs = (
  data: Hex,
  params: AbiStore.AbiParams,
): Effect.Effect<DecodeResult, DecodeError, AbiStore.AbiStore> =>
  Effect.gen(function* () {
    const { updateStatus } = yield* AbiStore.AbiStore

    // TODO: When abi is returned from external source, it does not have ids.
    // We could do a new db selct, change API of Store to return ids, or provide
    // ids instead of DB auto-generated ids.
    // Now it will fail only on the second call
    const abiWithIds = yield* getAndCacheAbi(params)

    // Create validation effects for store ABIs
    const storeValidationEffects = abiWithIds.map(({ abi, id }) =>
      Effect.gen(function* () {
        const result = yield* decodeMethod(data, abi)

        if (result == null) {
          return yield* Effect.fail(new DecodeError(`ABI ${abi} failed to decode`))
        }

        return result
      }).pipe(
        Effect.catchAll((error: DecodeError) => {
          return Effect.gen(function* () {
            if (updateStatus && id != null) {
              // Mark this ABI as invalid when it fails
              yield* updateStatus(id, 'invalid').pipe(Effect.catchAll(() => Effect.void))
            }
            return yield* Effect.fail(error)
          })
        }),
      ),
    )

    return yield* Effect.firstSuccessOf(storeValidationEffects)
  })

/**
 * Validates and decodes event logs using multiple ABIs with fallback support.
 * Tries each ABI in sequence and returns the first successful decode result along with the ABI used.
 * Similar to validateAndDecodeWithABIs but specifically for event logs.
 */
export const validateAndDecodeEventWithABIs = (
  topics: readonly Hex[],
  data: Hex,
  params: AbiStore.AbiParams,
): Effect.Effect<{ eventName: string; args: any; abiItem: Abi }, DecodeError, AbiStore.AbiStore> =>
  Effect.gen(function* () {
    const { updateStatus } = yield* AbiStore.AbiStore

    const abiWithIds = yield* getAndCacheAbi(params)

    const validationEffects = abiWithIds.map(({ abi, id }) =>
      Effect.gen(function* () {
        const result = yield* decodeEventLog(topics, data, abi as Abi)

        if (result == null) {
          return yield* Effect.fail(new DecodeError(`ABI failed to decode event`))
        }

        return { ...result, abiItem: abi as Abi }
      }).pipe(
        Effect.catchAll((error: DecodeError) => {
          return Effect.gen(function* () {
            if (updateStatus && id != null) {
              // Mark this ABI as invalid when it fails
              yield* updateStatus(id, 'invalid').pipe(Effect.catchAll(() => Effect.void))
            }
            return yield* Effect.fail(error)
          })
        }),
      ),
    )

    return yield* Effect.firstSuccessOf(validationEffects)
  })

export const decodeEventLog = (
  topics: readonly Hex[],
  data: Hex,
  abi: Abi,
): Effect.Effect<{ eventName: string; args: any } | undefined, DecodeError> =>
  Effect.gen(function* () {
    const { eventName, args = {} } = yield* Effect.try({
      try: () =>
        viemDecodeEventLog({ abi, topics: topics as [] | [`0x${string}`, ...`0x${string}`[]], data, strict: false }),
      catch: (error) => new DecodeError(`Could not decode event log`, error),
    })

    if (eventName == null) {
      return undefined
    }

    return { eventName, args }
  })
