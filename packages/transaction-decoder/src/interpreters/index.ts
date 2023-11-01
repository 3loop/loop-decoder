import { sameAddress } from '../helpers/address.js'
import type { DecodedTx, Interpreter } from '../types.js'
import jsonata from 'jsonata'

function findinterpretersForContract(
    contractAddress: string,
    chainID: number,
    interpreters: Interpreter[],
): Interpreter[] {
    return interpreters.filter(
        (interpreter) => sameAddress(interpreter.contractAddress, contractAddress) && interpreter.chainID === chainID,
    )
}

export async function findInterpreter({
    decodedTx,
    interpreters,
}: {
    decodedTx: DecodedTx
    interpreters: Interpreter[]
}): Promise<Interpreter | undefined> {
    try {
        const contractAddress = decodedTx.toAddress
        const chainID = decodedTx.chainID
        if (!contractAddress) {
            return undefined
        }

        const contractInterpreters = findinterpretersForContract(contractAddress, chainID, interpreters)

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
    } catch (e) {
        throw new Error(`Failed to find interpreter: ${e}`)
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
