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

const standardLibrary = '/**PLACE_STD_CONTENT**/'
const fallbackInterpreter = standardLibrary + '\n' + '/**PLACE_FALLBACK_CONTENT**/'

// TODO: Add a default interpreter as a fallback
function getInterpreter(tx: DecodedTx): string | undefined {
  const { chainID, toAddress, contractType } = tx
  const key = `${chainID}:${toAddress}`.toLowerCase()
  const id = contractToName[key]
  if (id) {
    return `${standardLibrary} \n ${interpretations[id]}`
  }

  const contractTypes = ['ERC20', 'ERC721', 'ERC1155']

  if (contractTypes.includes(contractType)) {
    const typeId = contractTypeToName[contractType.toLowerCase()]
    return `${standardLibrary} \n ${interpretations[typeId]}`
  }

  return undefined
}

export { getInterpreter, fallbackInterpreter }
