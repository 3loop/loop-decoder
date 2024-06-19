const interpretations: Record<string, string> = {
  /**PLACE_INTEPRETATIONS**/
}
const contractToName: Record<string, string> = {
  /**PLACE_CONTRACT_MAPPING**/
}

// TODO: Add a default interpreter as a fallback
function getInterpreterForContract({ address, chain }: { address: string; chain: number }): string | undefined {
  const key = `${chain}:${address}`
  const id = contractToName[key]
  if (!id) {
    return undefined
  }
  return interpretations[id]
}

export { getInterpreterForContract }
