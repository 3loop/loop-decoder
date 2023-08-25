import { Interface } from 'ethers'

const keywords = ['function', 'modifier', 'event', 'error', 'constructor', 'fallback', 'receive']

type Keyword = (typeof keywords)[number]

export function parseABI(rawABI: string, defaultKeyword: Keyword = 'function'): Interface | Error {
    const formated: string[] = []

    try {
        return new Interface(rawABI)
    } catch (e) {
        if (!(e instanceof Error && e.message.startsWith('Unexpected token'))) {
            return e as Error
        }
    }

    const parsed = rawABI
        .split("',")
        .map((line) =>
            line
                .trim()
                .split('')
                .filter((char) => char !== "'")
                .join(''),
        )
        .filter((line) => line)

    for (const frag of parsed) {
        if (!findKeyword(frag)) {
            if (frag.includes('indexed')) {
                formated.push(`event ${frag}`)
            } else {
                formated.push(`${defaultKeyword} ${frag}`)
            }
        } else {
            formated.push(frag)
        }
    }

    return new Interface(formated)
}

function findKeyword(frag: string): boolean {
    frag = frag.trim()

    let word = ''
    const match = new RegExp(/[a-zA-Z]/)

    for (const letter of frag.split('')) {
        if (!match.test(letter)) break
        else word += letter
    }

    for (const keyword of keywords) {
        if (keyword === word) return true
    }
    return false
}
