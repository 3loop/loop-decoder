import { ContractData, ContractType } from '../types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { getProxyImplementation } from '../decoding/proxies.js'
import { PublicClient } from '../public-client.js'

export const ProxyRPCStrategyResolver = (publicClientLive: PublicClient) => ({
  id: 'proxy-rpc-strategy',
  resolver: RequestResolver.fromEffect(({ chainId, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const proxyResult = yield* getProxyImplementation({ address, chainID: chainId })
      const { address: implementationAddress, type: proxyType } = proxyResult ?? {}

      if (!implementationAddress || !proxyType) {
        // Contract exists but is not a recognized proxy - this is a "no data found" case
        return yield* Effect.fail(
          new RequestModel.MissingMetaError(
            address,
            chainId,
            'proxy-rpc-strategy',
            'Contract is not a recognized proxy',
          ),
        )
      }

      let meta: ContractData | undefined

      if (proxyType === 'safe') {
        meta = {
          address,
          contractAddress: address,
          type: 'SAFE-PROXY' as ContractType,
          chainID: chainId,
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
        // Proxy detected but not supported type - this is a "no data found" case
        return yield* Effect.fail(
          new RequestModel.MissingMetaError(address, chainId, 'proxy-rpc-strategy', 'Proxy type not supported'),
        )
      }

      return meta
    }).pipe(Effect.withSpan('MetaStrategy.ProxyRPCStrategyResolver', { attributes: { chainId, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  ),
})
