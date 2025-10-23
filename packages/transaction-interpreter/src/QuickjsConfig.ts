import { Context } from 'effect'
import { QuickJSSyncVariant } from 'quickjs-emscripten'

export interface RuntimeConfig {
  timeout?: number
  memoryLimit?: number
  maxStackSize?: number
  useFetch?: boolean
}

export interface QuickjsConfig {
  readonly _: unique symbol
}

export interface QuickjsConfigService {
  readonly variant?: QuickJSSyncVariant
  readonly runtimeConfig?: RuntimeConfig
}

export const QuickjsConfig = Context.GenericTag<QuickjsConfig, QuickjsConfigService>('@3loop/QuickjsConfig')
