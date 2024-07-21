const interpretations: Record<string, string> = {
  /**PLACE_INTEPRETATIONS**/
}
const contractToName: Record<string, string> = {
  /**PLACE_CONTRACT_MAPPING**/
}

const standardLibrary = '/**PLACE_STD_CONTENT**/'
const fallbackInterpreter = standardLibrary + '\n' + '/**PLACE_FALLBACK_CONTENT**/'

// TODO: Add a default interpreter as a fallback
function getInterpreterForContract({ address, chain }: { address: string; chain: number }): string | undefined {
  const key = `${chain}:${address}`.toLowerCase()
  const id = contractToName[key]
  if (!id) {
    return undefined
  }
  return `${standardLibrary} \n ${interpretations[id]}`
}

export { getInterpreterForContract, fallbackInterpreter }
