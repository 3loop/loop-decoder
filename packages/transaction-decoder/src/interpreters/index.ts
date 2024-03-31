import { DecodedTx, Interpreter } from '@/types.js'
import makeVM from './vm.js'

async function runJSCode(input: string, code: string) {
    const vm = await makeVM(Date.now() + 1000)

    vm.evalCode(code)
    vm.runtime.executePendingJobs(-1)

    const result = vm.unwrapResult(vm.evalCode('transformEvent(' + input + ')'))
    const ok = vm.dump(result)

    result.dispose()
    vm.dispose()

    return ok
}

export function findInterpreter({
    decodedTx,
    interpreters,
}: {
    decodedTx: DecodedTx
    interpreters: Interpreter[]
}): Interpreter | undefined {
    try {
        const { toAddress: contractAddress, chainID } = decodedTx

        if (!contractAddress) {
            return undefined
        }

        const id = `contract:${contractAddress},chain:${chainID}`

        const contractTransformation = interpreters.find((interpreter) => interpreter.id === id)

        return contractTransformation
    } catch (e) {
        throw new Error(`Failed to find tx interpreter: ${e}`)
    }
}

export async function applyInterpreter({
    decodedTx,
    interpreter,
}: {
    decodedTx: DecodedTx
    interpreter: Interpreter
}): Promise<any> {
    try {
        const result = await runJSCode(JSON.stringify(decodedTx), interpreter.schema)
        return result
    } catch (e) {
        throw new Error(`Failed to run interpreter: ${e}`)
    }
}
