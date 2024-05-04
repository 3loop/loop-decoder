import { stringify } from '../helpers/stringify.js'
import { DecodedTx, Interpreter } from '@/types.js'
import { Context, Effect } from 'effect'
import {
  shouldInterruptAfterDeadline,
  QuickJSSyncVariant,
  QuickJSWASMModule,
  QuickJSRuntime,
  getQuickJS,
  newQuickJSWASMModuleFromVariant,
  QuickJSContext,
} from 'quickjs-emscripten'

interface RuntimeConfig {
  timeout?: number
  memoryLimit?: number
  maxStackSize?: number
}

export interface QuickJSVMConfig {
  variant?: QuickJSSyncVariant
  runtimeConfig?: RuntimeConfig
}

export interface QuickJSVM {
  readonly _tag: 'QuickJSVM'
  readonly runtime: QuickJSRuntime
}

export const QuickJSVM = Context.GenericTag<QuickJSVM>('@3loop-decoder/QuickJSVM')

export async function initQuickJSVM(config: QuickJSVMConfig): Promise<QuickJSRuntime> {
  const { variant, runtimeConfig = {} } = config
  const module = variant ? await newQuickJSWASMModuleFromVariant(variant) : await getQuickJS()
  const runtime = await newRuntime(module, runtimeConfig)
  return runtime
}

async function newRuntime(module: QuickJSWASMModule, config: RuntimeConfig): Promise<QuickJSRuntime> {
  const { timeout = -1, memoryLimit = 1024 * 640, maxStackSize = 1024 * 320 } = config
  const runtime = module.newRuntime()

  runtime.setMemoryLimit(memoryLimit)
  runtime.setMaxStackSize(maxStackSize)
  if (timeout !== -1) runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeout))

  return runtime
}

const newContext = () =>
  Effect.gen(function* () {
    const { runtime } = yield* QuickJSVM

    const vm: QuickJSContext = runtime.newContext()
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
  })

export const interpretTx = ({ decodedTx, interpreter }: { decodedTx: DecodedTx; interpreter: Interpreter }) =>
  Effect.gen(function* () {
    const input = stringify(decodedTx)
    const code = interpreter.schema
    const vm = yield* newContext()
    const result = vm.unwrapResult(vm.evalCode(code + '\n' + 'transformEvent(' + input + ')'))
    const ok = vm.dump(result)

    vm.runtime.executePendingJobs(-1)
    result.dispose()
    vm.dispose()

    return ok
  })
