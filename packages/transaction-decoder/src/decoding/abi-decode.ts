import { formatAbiItem } from 'viem/utils'
import type { DecodeResult, MostTypes, TreeNode } from '../types.js'
import { Hex, Abi, decodeFunctionData, AbiParameter, AbiFunction, getAbiItem } from 'viem'
import { Data, Effect } from 'effect'
import { messageFromUnknown } from '../helpers/error.js'

export class DecodeError extends Data.TaggedError('DecodeError')<{ message: string }> {
  constructor(error: unknown) {
    super({ message: `Failed to decode ${messageFromUnknown(error)}` })
  }
}

export class MissingABIError extends Data.TaggedError('DecodeError')<{ message: string }> {
  constructor(
    readonly address: string,
    readonly signature: string,
    readonly chainID: number,
  ) {
    super({ message: `Missing ABI for ${address} with signature ${signature} on chain ${chainID}` })
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
      catch: (error) => new DecodeError(error),
    })

    const method = getAbiItem({ abi, name: functionName, args }) as AbiFunction | undefined

    if (method != null) {
      const signature = yield* Effect.try({
        try: () => formatAbiItem(method),
        catch: (error) => new DecodeError(error),
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
