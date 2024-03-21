import { getAddress } from 'viem'

export function sameAddress(a?: string | null, b?: string | null): boolean {
    if (a == null || b == null) return false

    return getAddress(a) === getAddress(b)
}
