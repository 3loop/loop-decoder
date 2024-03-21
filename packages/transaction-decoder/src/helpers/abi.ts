import { Abi } from 'viem'
import { formatAbiItem, toFunctionSelector } from 'viem/utils'

export type AbiItemType = 'constructor' | 'error' | 'event' | 'fallback' | 'function' | 'receive'

interface Signature {
    type: AbiItemType
    signature: string
    fragment: string
}

type AbiItem = Abi[number]

export function convertAbiToFragments(abi: string): Signature[] {
    const data_ = JSON.parse(abi)

    if (Array.isArray(data_)) {
        const data = data_ as Abi
        const fragments: Signature[] = []

        data.forEach(async (item) => {
            fragments.push({
                type: item.type,
                signature: toFunctionSelector(formatAbiItem(item)),
                fragment: JSON.stringify(item),
            })
        })

        return fragments
    } else {
        const data = data_ as AbiItem
        return [
            {
                type: data.type,
                signature: toFunctionSelector(formatAbiItem(data)),
                fragment: abi,
            },
        ]
    }
}
