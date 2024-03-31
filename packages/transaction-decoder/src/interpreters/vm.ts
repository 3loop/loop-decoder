import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten'

export default async function makeVM(timeout = -1) {
    const QuickJS = await getQuickJS()
    const vm = QuickJS.newContext()
    if (timeout !== -1) {
        vm.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeout))
    }

    // `console.log`
    const logHandle = vm.newFunction('log', (...args) => {
        const nativeArgs = args.map(vm.dump)
        console.log('TxDecoder:', ...nativeArgs)
    })

    // Partially implement `console` object
    const consoleHandle = vm.newObject()
    vm.setProp(consoleHandle, 'log', logHandle)
    vm.setProp(vm.global, 'console', consoleHandle)

    consoleHandle.dispose()
    logHandle.dispose()

    return vm
}
