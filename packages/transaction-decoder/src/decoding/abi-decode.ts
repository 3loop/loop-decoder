import type { ParamType } from 'ethers'
import { Interface } from 'ethers'
import type { DecodeResult, InputArg, MostTypes, TreeNode } from '../types.js'
import { parseABI } from './parse-abi.js'

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

function attachValues(components: ParamType[], decoded: any): TreeNode[] {
    return components.map((input, index): TreeNode => {
        if (input.type === 'tuple') {
            const value = decoded[index]
            if (!Array.isArray(value)) {
                throw new Error('input.type is tuple, but decoded value is not an array')
            }
            const components = input.components ? [...input.components] : []
            return {
                name: input.name,
                type: input.type,
                components: attachValues(components, value),
            }
        }

        return {
            name: input.name,
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

export function decodeMethod(data: string, abi: string): DecodeResult | undefined {
    const iface = parseABI(abi)
    if (iface instanceof Error) {
        return
    }

    if (iface instanceof Interface) {
        const decoded = iface.parseTransaction({ data })

        if (decoded) {
            const inputs = decoded.fragment.inputs ? [...decoded.fragment.inputs] : undefined

            let flattened: InputArg[] = []

            if (inputs != null) {
                const withValues = attachValues(inputs, decoded.args)
                flattened = flattenTree(withValues)
            }

            if (flattenTree.length === 0) {
                return {
                    name: decoded.name,
                    signature: decoded.signature,
                    type: decoded.fragment.type,
                }
            }
            return {
                name: decoded.name,
                signature: decoded.signature,
                type: decoded.fragment.type,
                params: flattened,
            }
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
