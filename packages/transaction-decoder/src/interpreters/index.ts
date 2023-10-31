import { sameAddress } from '../helpers/address.js'
import type { DecodedTx, Interpreter } from '../types.js'
import jsonata from 'jsonata'

function findInterpretorsForContract(
    contractAddress: string,
    chainID: number,
    interpretors: Interpreter[],
): Interpreter[] {
    return interpretors.filter(
        (interpretor) => sameAddress(interpretor.contractAddress, contractAddress) && interpretor.chainID === chainID,
    )
}

export async function findInterpreter({
    decodedTx,
    interpretors,
}: {
    decodedTx: DecodedTx
    interpretors: Interpreter[]
}): Promise<Interpreter | undefined> {
    const contractAddress = decodedTx.toAddress
    const chainID = decodedTx.chainID
    if (!contractAddress) {
        return undefined
    }

    const contractInterpreters = findInterpretorsForContract(contractAddress, chainID, interpretors)

    if (!contractInterpreters) {
        return undefined
    }

    for (const interpreter of contractInterpreters) {
        const canInterpret = jsonata(interpreter.filter)
        const canInterpretResult = await canInterpret.evaluate(decodedTx)

        if (!canInterpretResult) {
            continue
        }
        return interpreter
    }
}

export async function runInterpreter({
    decodedTx,
    interpreter,
}: {
    decodedTx: DecodedTx
    interpreter: Interpreter
}): Promise<any> {
    try {
        const expression = jsonata(interpreter.schema)
        const result = await expression.evaluate(decodedTx)
        return result
    } catch (e) {
        throw new Error(`Failed to run interpreter: ${e}`)
    }
}
