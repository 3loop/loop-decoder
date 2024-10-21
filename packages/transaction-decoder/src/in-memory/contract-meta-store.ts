import type { ContractData } from '../types.js'
import { ContractMetaStore, ERC20RPCStrategyResolver, NFTRPCStrategyResolver, PublicClient } from '../effect.js'
import { Effect, Layer } from 'effect'

const contractMetaCache = new Map<string, ContractData>()

export const InMemoryContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* () {
    const publicClient = yield* PublicClient
    const erc20Loader = ERC20RPCStrategyResolver(publicClient)
    const nftLoader = NFTRPCStrategyResolver(publicClient)
    return ContractMetaStore.of({
      strategies: { default: [erc20Loader, nftLoader] },
      get: ({ address, chainID }) =>
        Effect.sync(() => {
          const key = `${address}-${chainID}`.toLowerCase()
          const value = contractMetaCache.get(key)

          if (value) {
            return {
              status: 'success',
              result: value,
            }
          }

          return {
            status: 'empty',
            result: null,
          }
        }),
      set: ({ address, chainID }, result) =>
        Effect.sync(() => {
          const key = `${address}-${chainID}`.toLowerCase()

          if (result.status === 'success') {
            contractMetaCache.set(key, result.result)
          }
        }),
    })
  }),
)
