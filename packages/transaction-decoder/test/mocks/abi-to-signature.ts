import * as fs from 'fs'
import { convertAbiToFragments } from '../../src/helpers/abi.js'

export async function main(abiPath: string) {
  const abi = fs.readFileSync(abiPath).toString()

  const fragments = convertAbiToFragments(abi)

  fragments.forEach((fragment) => {
    const path = `./test/mocks/abi/${fragment.signature.toLowerCase()}.json`
    fs.writeFileSync(path, fragment.fragment)
  })
}

main(process.argv[2])
