import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi, getAddress, getContract } from 'viem'

const getLocalFragments = (service: PublicClient, { address, chainId }: RequestModel.GetContractABIStrategy) =>
  Effect.gen(function* () {
    const client = yield* service
      .getPublicClient(chainId)
      .pipe(
        Effect.catchAll(() =>
          Effect.fail(new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId)),
        ),
      )

    const inst = getContract({
      abi: erc20Abi,
      address: getAddress(address),
      client: client.client,
    })

    const decimals = yield* Effect.tryPromise({
      try: () => inst.read.decimals(),
      catch: () => new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId),
    })

    if (decimals != null) {
      return [
        {
          type: 'address',
          address,
          chainID: chainId,
          abi: JSON.stringify(erc20Abi),
        },
      ] as RequestModel.ContractABI[]
    }

    return yield* Effect.fail(new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId))
  })

export const ExperimentalErc20AbiStrategyResolver = (
  service: PublicClient,
): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'experimental-erc20-strategy',
    type: 'address',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(getLocalFragments(service, req), 'AbiStrategy.ExperimentalErc20AbiStrategyResolver', {
        attributes: { chainId: req.chainId, address: req.address },
      }),
    ),
  }
}
