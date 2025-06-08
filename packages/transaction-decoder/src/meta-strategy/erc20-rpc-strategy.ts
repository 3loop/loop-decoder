import { ContractData, ContractType } from '../types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi } from 'viem'
import { MULTICALL3_ADDRESS } from '../decoding/constants.js'

export const ERC20RPCStrategyResolver = (
  publicClientLive: PublicClient,
): RequestModel.ContractMetaResolverStrategy => ({
  id: 'erc20-rpc-strategy',
  resolver: RequestResolver.fromEffect(({ chainId, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const service = yield* PublicClient
      const { client } = yield* service.getPublicClient(chainId)

      const fail = new RequestModel.ResolveStrategyMetaError('ERC20RPCStrategy', address, chainId)

      const [symbolResponse, decimalsResponse, nameResponse] = yield* Effect.tryPromise({
        try: () =>
          client.multicall({
            multicallAddress: MULTICALL3_ADDRESS,
            contracts: [
              {
                abi: erc20Abi,
                address,
                functionName: 'symbol',
              },
              {
                abi: erc20Abi,
                address,
                functionName: 'decimals',
              },
              {
                abi: erc20Abi,
                address,
                functionName: 'name',
              },
            ],
          }),
        catch: () => {
          return fail
        },
      })

      if (decimalsResponse.status !== 'success') {
        // Contract exists but doesn't have ERC20 decimals - this is a "no data found" case
        return yield* Effect.fail(
          new RequestModel.MissingMetaError(address, chainId, 'erc20-rpc-strategy', 'Contract is not an ERC20 token'),
        )
      }

      const meta: ContractData = {
        address,
        contractAddress: address,
        contractName: nameResponse.result,
        tokenSymbol: symbolResponse.result,
        decimals: Number(decimalsResponse.result),
        type: 'ERC20' as ContractType,
        chainID: chainId,
      }

      return meta
    }).pipe(Effect.withSpan('MetaStrategy.ERC20RPCStrategyResolver', { attributes: { chainId, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  ),
})
