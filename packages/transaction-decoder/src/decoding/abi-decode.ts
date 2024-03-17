import { formatAbiItem } from 'viem/utils'
import type { DecodeResult, InputArg, MostTypes, TreeNode } from '../types.js'
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

function attachTupleValues(components: readonly AbiParameter[], decoded: Record<string, any>): TreeNode[] {
    return components.map((input): TreeNode => {
        if (input.name === undefined) {
            throw new Error('input.name is undefined')
        }
        return {
            name: input.name ?? 'unknown',
            type: input.type,
            value: decoded[input.name] ? stringifyValue(decoded[input.name]) : '',
        }
    })
}

function attachValues(components: readonly AbiParameter[], decoded: readonly any[]): TreeNode[] {
    return components.map((input, index): TreeNode => {
        if (input.type === 'tuple[]' && 'components' in input) {
            return {
                name: input.name ?? 'unknown',
                type: input.type,
                components: attachValues(input.components, decoded),
            }
        }

        if (input.type === 'tuple' && 'components' in input) {
            const value = decoded[index]

            return {
                name: input.name ?? 'unknown',
                type: input.type,
                components: attachTupleValues(input.components, value),
            }
        }

        return {
            name: input.name ?? 'unknown',
            type: input.type,
            value: decoded[index] ? stringifyValue(decoded[index]) : '',
        }
    })
}

function flattenTree(tree: TreeNode[]): InputArg[] {
    return tree.reduce<InputArg[]>((acc, node) => {
        if (node.components) {
            return [...acc, ...flattenTree(node.components)]
        }
        return [...acc, node]
    }, [])
}

export function decodeMethod(data: Hex, abi: Abi): DecodeResult | undefined {
    const { functionName, args = [] } = decodeFunctionData({ abi, data })

    const method = getAbiItem({ abi, name: functionName, args }) as AbiFunction | undefined

    if (method != null) {
        const signature = formatAbiItem(method)
        let flattened: InputArg[] = []

        const withValues = attachValues(method.inputs, args)
        flattened = flattenTree(withValues)

        if (flattenTree.length === 0) {
            return {
                name: functionName,
                signature,
                type: 'function',
            }
        }
        return {
            name: functionName,
            signature,
            type: 'function',
            params: flattened,
        }
    }
}

export function transformDecodedData(rawDecodedCallData: DecodeResult) {
    const params: Record<string, MostTypes> = {}

    rawDecodedCallData.params?.forEach((param) => {
        params[param.name] = param.value
    })

    return {
        name: rawDecodedCallData.name,
        params,
    }
}
