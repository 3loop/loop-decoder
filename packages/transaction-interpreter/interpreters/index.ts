import { DecodedTx } from '@3loop/transaction-decoder'

const interpretations: Record<string, string> = {
  /**PLACE_INTEPRETATIONS**/
}
const contractToName: Record<string, string> = {
  /**PLACE_CONTRACT_MAPPING**/
}

const contractTypeToName: Record<string, string> = {
  /**PLACE_CONTRACT_TYPE_MAPPING**/
}

const eventToName: Record<string, string> = {
  /**PLACE_EVENT_MAPPING**/
}

const standardLibrary = '/**PLACE_STD_CONTENT**/'
const fallbackInterpreter = standardLibrary + '\n' + '/**PLACE_FALLBACK_CONTENT**/'

// TODO: Add a default interpreter as a fallback
function getInterpreter(tx: DecodedTx): string | undefined {
  const { chainID, toAddress, contractType } = tx
  const key = `${chainID}:${toAddress}`.toLowerCase()
  const id = contractToName[key]

  //if there is a contract mapping, return the contract interpreter
  if (id) {
    return `${standardLibrary} \n ${interpretations[id]}`
  }

  // Check for event mapping and return the corresponding interpreter
  const eventInterpreter = tx.interactions
    .map((event) => event.signature)
    .filter((signature): signature is string => signature != null)
    .map((signature) => signature.toLowerCase())
    .map((eventKey) => eventToName[eventKey])
    .find((eventId) => interpretations[eventId])

  if (eventInterpreter) {
    return `${standardLibrary}\n${interpretations[eventInterpreter]}`
  }

  //if there is a contract type mapping, return the contract type interpreter
  const contractTypes = ['ERC20', 'ERC721', 'ERC1155']
  if (contractTypes.includes(contractType)) {
    const typeId = contractTypeToName[contractType.toLowerCase()]
    return `${standardLibrary} \n ${interpretations[typeId]}`
  }

  return undefined
}

export { getInterpreter, fallbackInterpreter }
