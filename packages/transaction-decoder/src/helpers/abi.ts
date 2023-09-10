import { type InterfaceAbi, Interface } from 'ethers'

interface Signature {
    type: 'function' | 'event'
    signature: string
    fragment: string
}

export function convertAbiToFragments(abi: InterfaceAbi): Signature[] {
    const data = new Interface(abi)
    const fragments: Signature[] = []

    data.forEachFunction(async (func) => {
        fragments.push({
            type: 'function',
            signature: func.selector,
            fragment: JSON.stringify(func),
        })
    })

    data.forEachEvent((event) => {
        fragments.push({
            type: 'event',
            signature: event.topicHash,
            fragment: JSON.stringify(event),
        })
    })

    return fragments
}
