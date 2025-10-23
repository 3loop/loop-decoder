import { Data, Effect } from 'effect'
import {
  shouldInterruptAfterDeadline,
  QuickJSRuntime,
  getQuickJS,
  newQuickJSWASMModuleFromVariant,
  QuickJSContext,
  QuickJSSyncVariant,
  Scope,
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

const PROMISE_TIMEOUT_MS = 10000

const DEFAULT_QUICKJS_CONFIG = {
  timeout: -1,
  memoryLimit: 1024 * 640,
  maxStackSize: 1024 * 320,
  useFetch: false,
}

// Response prototype code for fetch API
const responsePrototypeCode = `
({
  async json() {
    return JSON.parse(await this.text());
  }
})
`

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
  const {
    timeout = DEFAULT_QUICKJS_CONFIG.timeout,
    memoryLimit = DEFAULT_QUICKJS_CONFIG.memoryLimit,
    maxStackSize = DEFAULT_QUICKJS_CONFIG.maxStackSize,
  } = runtimeConfig

  const runtime = module.newRuntime()

  runtime.setMemoryLimit(memoryLimit)
  runtime.setMaxStackSize(maxStackSize)

  if (timeout !== -1) runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeout))

  return runtime
}

const acquire = Effect.gen(function* () {
  const config = yield* QuickjsConfig
  const useFetch =
    config.runtimeConfig?.useFetch !== undefined ? config.runtimeConfig.useFetch : DEFAULT_QUICKJS_CONFIG.useFetch

  const runtime = yield* Effect.promise(() => {
    return initQuickJSVM({ variant: config.variant as QuickJSSyncVariant, runtimeConfig: config.runtimeConfig })
  })

  const vm: QuickJSContext = runtime.newContext()
  const scope = new Scope()

  // Create Response prototype for fetch API
  const responsePrototype = scope.manage(vm.unwrapResult(vm.evalCode(responsePrototypeCode)))

  // `console.log`
  const logHandle = scope.manage(
    vm.newFunction('log', (...args) => {
      const nativeArgs = args.map(vm.dump)
      console.log('TransactionInterpreter:', ...nativeArgs)
    }),
  )

  // Partially implement `console` object
  const consoleHandle = scope.manage(vm.newObject())
  vm.setProp(consoleHandle, 'log', logHandle)
  vm.setProp(vm.global, 'console', consoleHandle)

  if (useFetch) {
    // Provide fetch API with minimal Response object
    const fetchHandle = scope.manage(
      vm.newFunction('fetch', (urlHandle, optionsHandle) => {
        const url = vm.getString(urlHandle)
        const options = optionsHandle ? vm.dump(optionsHandle) : undefined

        const qjsPromise = scope.manage(vm.newPromise())

        globalThis
          .fetch(url, {
            ...options,
            credentials: 'omit', // Security: never include credentials
          })
          .then((res) => {
            // Check if VM is still alive before proceeding
            if (!vm.alive) return

            if (res === undefined) {
              qjsPromise.resolve(vm.undefined)
              return
            }

            // Create minimal Response object with prototype
            const responseObj = scope.manage(vm.newObject(responsePrototype))
            vm.setProp(responseObj, 'ok', res.ok ? vm.true : vm.false)
            vm.setProp(responseObj, 'status', scope.manage(vm.newNumber(res.status)))

            // Add text() method
            const textFn = scope.manage(
              vm.newFunction('text', () => {
                const textPromise = scope.manage(vm.newPromise())
                res
                  .text()
                  .then((str) => {
                    if (!vm.alive) return
                    textPromise.resolve(scope.manage(vm.newString(str)))
                  })
                  .catch((e) => {
                    if (!vm.alive) return
                    textPromise.reject(
                      scope.manage(
                        vm.newError({
                          name: 'FetchError',
                          message: e.message || 'Failed to read response text',
                        }),
                      ),
                    )
                  })
                // Execute pending jobs when promise settles
                textPromise.settled.then(() => vm.runtime.executePendingJobs())
                return textPromise.handle
              }),
            )
            vm.setProp(responseObj, 'text', textFn)

            qjsPromise.resolve(responseObj)
          })
          .catch((e) => {
            if (!vm.alive) return
            qjsPromise.reject(
              scope.manage(
                vm.newError({
                  name: 'FetchError',
                  message: e.message || 'Fetch failed',
                }),
              ),
            )
          })

        // Execute pending jobs when promise settles
        qjsPromise.settled.then(() => vm.runtime.executePendingJobs())
        return qjsPromise.handle
      }),
    )

    vm.setProp(vm.global, 'fetch', fetchHandle)
  }

  return {
    runtime,
    eval: (code: string) =>
      Effect.tryPromise({
        try: async () => {
          // Create a new scope for this evaluation to prevent handle accumulation
          const evalScope = new Scope()

          try {
            const result = vm.evalCode(code)

            if (result.error) {
              const errorObj = vm.dump(result.error)
              // Dispose error immediately after dumping
              result.error.dispose()
              const error = new Error(errorObj.message)
              error.stack = errorObj.stack
              throw error
            }

            const resultHandle = evalScope.manage(result.value)

            // Check if result is a promise
            const thenProp = vm.getProp(resultHandle, 'then')
            const isPromise = vm.typeof(resultHandle) === 'object' && vm.typeof(thenProp) === 'function'
            // Dispose check handle immediately
            thenProp.dispose()

            if (isPromise) {
              // Resolve the promise with a timeout
              const promiseResolution = vm.resolvePromise(resultHandle)

              // Execute pending jobs periodically to allow promises to settle
              let jobExecutionActive = true
              const executeJobsPeriodically = async () => {
                while (jobExecutionActive) {
                  await vm.runtime.executePendingJobs()
                  await new Promise((resolve) => setTimeout(resolve, 10))
                }
              }

              // Start job execution in background
              const jobExecution = executeJobsPeriodically()

              try {
                // Race between promise settling and timeout
                const promiseResult = await Promise.race([
                  promiseResolution,
                  new Promise<never>((_, reject) => {
                    setTimeout(() => {
                      reject(new Error(`Promise resolution timeout after ${PROMISE_TIMEOUT_MS}ms`))
                    }, PROMISE_TIMEOUT_MS)
                  }),
                ])

                if (promiseResult.error) {
                  const errorObj = vm.dump(promiseResult.error)
                  // Dispose error after dumping
                  promiseResult.error.dispose()
                  const error = new Error(errorObj.message)
                  error.stack = errorObj.stack
                  throw error
                }

                const finalValue = vm.dump(promiseResult.value)
                // Dispose result after dumping
                promiseResult.value.dispose()
                return finalValue
              } finally {
                // ALWAYS stop job execution, even on error/timeout
                jobExecutionActive = false
                await jobExecution.catch(() => {
                  /* ignore */
                })
              }
            } else {
              // For sync results: just dump and return
              const ok = vm.dump(resultHandle)
              return ok
            }
          } finally {
            // ALWAYS cleanup evaluation scope, even on error
            evalScope.dispose()
          }
        },
        catch: (error: unknown) => {
          return new InterpreterError(error)
        },
      }),
    dispose: () => {
      if (!vm.alive) return
      vm.runtime.executePendingJobs(-1)
      scope.dispose()
      vm.dispose()
      runtime.dispose()
    },
  }
})

const release = (res: QuickJSVM) => Effect.sync(() => res.dispose())

export const QuickjsVM = Effect.acquireRelease(acquire, release)
