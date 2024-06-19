import { Effect } from 'effect'
import {
  shouldInterruptAfterDeadline,
  QuickJSRuntime,
  getQuickJS,
  newQuickJSWASMModuleFromVariant,
  QuickJSContext,
  QuickJSSyncVariant,
} from 'quickjs-emscripten'
import { InterpretedTransaction } from './types.js'
import { QuickjsConfig, RuntimeConfig } from './QuickjsConfig.js'

export interface QuickJSVM {
  readonly runtime: QuickJSRuntime
  readonly eval: (code: string) => Effect.Effect<InterpretedTransaction, unknown, never>
  readonly dispose: () => void
}

async function initQuickJSVM(config: {
  variant?: QuickJSSyncVariant
  runtimeConfig?: RuntimeConfig
}): Promise<QuickJSRuntime> {
  const { variant, runtimeConfig = {} } = config
  const module = variant ? await newQuickJSWASMModuleFromVariant(variant) : await getQuickJS()
  const { timeout = -1, memoryLimit = 1024 * 640, maxStackSize = 1024 * 320 } = runtimeConfig

  const runtime = module.newRuntime()

  runtime.setMemoryLimit(memoryLimit)
  runtime.setMaxStackSize(maxStackSize)

  if (timeout !== -1) runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeout))

  return runtime
}

const acquire = Effect.gen(function* () {
  const config = yield* QuickjsConfig

  const runtime = yield* Effect.promise(() => initQuickJSVM(config))

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

  return {
    runtime,
    eval: (code: string) =>
      Effect.sync(() => {
        const result = vm.unwrapResult(vm.evalCode(code))
        const ok = vm.dump(result)
        result.dispose()
        return ok
      }),
    dispose: () => {
      vm.runtime.executePendingJobs(-1)
      vm.dispose()
    },
  }
})

const release = (res: QuickJSVM) => Effect.sync(() => res.dispose())

export const QuickjsVM = Effect.acquireRelease(acquire, release)
