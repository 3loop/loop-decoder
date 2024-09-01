import { Data, Effect } from 'effect'
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

export class InterpreterError extends Data.TaggedError('InterpreterError')<{
  message: string
}> {
  constructor(error: unknown) {
    super({
      message: (error as Error).message,
    })
  }
}

export interface QuickJSVM {
  readonly runtime: QuickJSRuntime
  readonly eval: (code: string) => Effect.Effect<InterpretedTransaction, InterpreterError, never>
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
      Effect.try({
        try: () => {
          const result = vm.evalCode(code)
          if (result.error) {
            const errorObj = vm.dump(result.error)
            result.error.dispose()
            const error = new Error(errorObj.message)
            error.stack = errorObj.stack
            throw error
          }
          const ok = vm.dump(result.value)
          result.value.dispose()
          return ok
        },
        catch: (error: unknown) => {
          return new InterpreterError(error)
        },
      }),
    dispose: () => {
      vm.runtime.executePendingJobs(-1)
      vm.dispose()
    },
  }
})

const release = (res: QuickJSVM) => Effect.sync(() => res.dispose())

export const QuickjsVM = Effect.acquireRelease(acquire, release)
