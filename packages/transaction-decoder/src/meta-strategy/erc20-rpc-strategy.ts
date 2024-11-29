import { ContractData, ContractType } from '../types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi } from 'viem'
import { MULTICALL3_ADDRESS } from '../decoding/constants.js'

export const ERC20RPCStrategyResolver = (publicClientLive: PublicClient) =>
  RequestResolver.fromEffect(({ chainID, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const service = yield* PublicClient
      const { client } = yield* service.getPublicClient(chainID)

      const fail = new RequestModel.ResolveStrategyMetaError('ERC20RPCStrategy', address, chainID)

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
        return yield* Effect.fail(fail)
      }

      const meta: ContractData = {
        address,
        contractAddress: address,
        contractName: nameResponse.result,
        tokenSymbol: symbolResponse.result,
        decimals: Number(decimalsResponse.result),
        type: 'ERC20' as ContractType,
        chainID,
      }

      return meta
    }).pipe(Effect.withSpan('MetaStrategy.ERC20RPCStrategyResolver', { attributes: { chainID, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  )
