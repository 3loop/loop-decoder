import { Context, Effect } from 'effect'
import { PublicClient as ViemPublicClient } from 'viem'

export class UnknownNetwork {
  readonly _tag = 'UnknownNetwork'
  constructor(readonly chainID: number) {}
}

export class RPCFetchError {
  readonly _tag = 'RPCFetchError'
  constructor(readonly reason: unknown) {}
}

export interface PublicClientConfig {
  readonly supportTraceAPI?: boolean
}

export interface PublicClientObject {
  client: ViemPublicClient
  config?: PublicClientConfig
}

export interface PublicClient {
  readonly _tag: 'PublicClient'
  readonly getPublicClient: (chainID: number) => Effect.Effect<PublicClientObject, UnknownNetwork>
}

export const PublicClient = Context.GenericTag<PublicClient>('@3loop-decoder/PublicClient')
