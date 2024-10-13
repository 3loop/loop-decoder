import { ContractData, ContractType } from '../types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { getProxyStorageSlot } from '../decoding/proxies.js'
import { PublicClient } from '../public-client.js'

export const ProxyRPCStrategyResolver = (publicClientLive: PublicClient) =>
  RequestResolver.fromEffect(({ chainID, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const proxyResult = yield* getProxyStorageSlot({ address, chainID })
      const { address: implementationAddress, type: proxyType } = proxyResult ?? {}

      const fail = new RequestModel.ResolveStrategyMetaError('ProxyRPCStrategy', address, chainID)

      if (!implementationAddress || !proxyType) {
        return yield* Effect.fail(fail)
      }

      let meta: ContractData | undefined

      if (proxyType === 'safe') {
        meta = {
          address,
          contractAddress: address,
          type: 'SAFE-PROXY' as ContractType,
          chainID,
        }
      }

      // NOTE: ERC1967 is not supported yet becasue some tokens are using this proxy type
      // if (proxyType === 'eip1967') {
      //   meta = {
      //     address,
      //     contractAddress: address,
      //     type: 'ERC1967-PROXY' as ContractType,
      //     chainID,
      //   }
      // }

      if (!meta) {
        return yield* Effect.fail(fail)
      }

      return meta
    }).pipe(Effect.withSpan('MetaStrategy.ProxyRPCStrategyResolver', { attributes: { chainID, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  )
