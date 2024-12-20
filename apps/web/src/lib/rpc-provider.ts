import { PublicClient, UnknownNetwork, PublicClientObject } from '@3loop/transaction-decoder'
import { Layer, Effect } from 'effect'
import { supportedChains } from '@/app/data'
import { createPublicClient, http } from 'viem'

const providerConfigs: Record<string, (typeof supportedChains)[number]> = supportedChains.reduce((acc, config) => {
  return {
    ...acc,
    [config.chainID]: config,
  }
}, {})

export function getProvider(chainID: number): PublicClientObject | null {
  const url = providerConfigs[chainID]?.rpcUrl

  if (url != null) {
    return {
      client: createPublicClient({
        transport: http(url),
      }),
      config: {
        traceAPI: providerConfigs[chainID]?.traceAPI,
      },
    }
  }

  return null
}

export const RPCProviderLive = Layer.succeed(
  PublicClient,
  PublicClient.of({
    _tag: 'PublicClient',
    getPublicClient: (chainID: number) => {
      const provider = getProvider(chainID)
      if (provider != null) {
        return Effect.succeed(provider)
      }
      return Effect.fail(new UnknownNetwork(chainID))
    },
  }),
)
