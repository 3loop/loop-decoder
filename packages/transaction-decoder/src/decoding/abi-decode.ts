import { formatAbiItem } from 'viem/utils'
import type { DecodeResult, MostTypes, TreeNode } from '../types.js'
import { Hex, Abi, decodeFunctionData, AbiParameter, AbiFunction, getAbiItem } from 'viem'

export class DecodeError {
  readonly _tag = 'DecodeError'
  constructor(readonly error: unknown) {}
}

export class MissingABIError {
  readonly _tag = 'MissingABIError'
  constructor(
    readonly address: string,
    readonly signature: string,
    readonly chainID: number,
  ) {}
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

// @ts-expect-error - BigInt is not defined in the global scope
BigInt.prototype.toJSON = function () {
  return this.toString()
}

export function decodeMethod(data: Hex, abi: Abi): DecodeResult | undefined {
  const { functionName, args = [] } = decodeFunctionData({ abi, data })

  const method = getAbiItem({ abi, name: functionName, args }) as AbiFunction | undefined

  if (method != null) {
    const signature = formatAbiItem(method)

    const paramsTree = attachValues(method.inputs, args)

    return {
      name: functionName,
      signature,
      type: 'function',
      params: paramsTree,
    }
  }
}
