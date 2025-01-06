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
        transport: http(url, {
          // Requests logging
          // onFetchRequest(request) {
          //   const reader = request.body?.getReader()
          //   if (!reader) {
          //     return
          //   }
          //   let body = ''
          //   reader
          //     .read()
          //     .then(function processText({ done, value }) {
          //       if (done) {
          //         return
          //       }
          //       // value for fetch streams is a Uint8Array
          //       body += value
          //       reader.read().then(processText)
          //     })
          //     .then(() => {
          //       const json = JSON.parse(
          //         body
          //           .split(',')
          //           .map((code) => String.fromCharCode(parseInt(code, 10)))
          //           .join(''),
          //       )
          //       try {
          //         console.log(JSON.stringify(json, null, 2))
          //       } catch (e) {
          //         console.log(json['id'], json['method'], body.length)
          //       }
          //     })
          // },
        }),
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
