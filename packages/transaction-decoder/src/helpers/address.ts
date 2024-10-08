import { getAddress } from 'viem'

export function sameAddress(a?: string | null, b?: string | null): boolean {
  if (a == null || b == null || a === '' || b === '') return false

  return getAddress(a) === getAddress(b)
}
