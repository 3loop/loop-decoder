import { ContractData, ContractType } from '@/types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi, getContract } from 'viem'

export const ERC20RPCStrategyResolver = (publicClientLive: PublicClient) =>
  RequestResolver.fromEffect(({ chainID, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* (_) {
      const service = yield* _(PublicClient)
      const { client } = yield* _(service.getPublicClient(chainID))

      const inst = getContract({
        abi: erc20Abi,
        address,
        client,
      })

      const fail = new RequestModel.ResolveStrategyMetaError('ERC20RPCStrategy', address, chainID)

      const decimals = yield* _(
        Effect.tryPromise({
          try: () => inst.read.decimals(),
          catch: () => fail,
        }),
      )

      if (decimals == null) {
        return yield* _(Effect.fail(fail))
      }

      const [symbol, name] = yield* _(
        Effect.all(
          [
            Effect.tryPromise({ try: () => inst.read.symbol(), catch: () => fail }),
            Effect.tryPromise({ try: () => inst.read.name(), catch: () => fail }),
          ],
          {
            concurrency: 'inherit',
            batching: 'inherit',
          },
        ),
      )

      const meta: ContractData = {
        address,
        contractAddress: address,
        contractName: name,
        tokenSymbol: symbol,
        decimals: Number(decimals),
        type: 'ERC20' as ContractType,
        chainID,
      }

      return meta
    }),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  )
