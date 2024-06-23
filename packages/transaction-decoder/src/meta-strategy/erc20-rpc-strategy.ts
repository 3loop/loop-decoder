import { ContractData, ContractType } from '@/types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi, getContract } from 'viem'

export const ERC20RPCStrategyResolver = (publicClientLive: PublicClient) =>
  RequestResolver.fromEffect(({ chainID, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const service = yield* PublicClient
      const { client } = yield* service.getPublicClient(chainID)

      const inst = getContract({
        abi: erc20Abi,
        address,
        client,
      })

      const fail = new RequestModel.ResolveStrategyMetaError('ERC20RPCStrategy', address, chainID)

      const decimals = yield* Effect.tryPromise({
        try: () => inst.read.decimals(),
        catch: () => fail,
      })

      if (decimals == null) {
        return yield* Effect.fail(fail)
      }

      //NOTE: keep for now to support blur pools
      const [symbol, name] = yield* Effect.all(
        [
          Effect.tryPromise({ try: () => inst.read.symbol().catch(() => ''), catch: () => fail }),
          Effect.tryPromise({ try: () => inst.read.name().catch(() => ''), catch: () => fail }),
        ],
        {
          concurrency: 'inherit',
          batching: 'inherit',
        },
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
    }).pipe(Effect.withSpan('MetaStrategy.ERC20RPCStrategyResolver', { attributes: { chainID, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  )
