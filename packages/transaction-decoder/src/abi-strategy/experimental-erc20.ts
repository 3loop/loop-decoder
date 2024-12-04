import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi, getAddress, getContract } from 'viem'

const getLocalFragments = (service: PublicClient, { address, chainID }: RequestModel.GetContractABIStrategy) =>
  Effect.gen(function* () {
    const client = yield* service
      .getPublicClient(chainID)
      .pipe(
        Effect.catchAll(() =>
          Effect.fail(new RequestModel.ResolveStrategyABIError('local-strategy', address, chainID)),
        ),
      )

    const inst = getContract({
      abi: erc20Abi,
      address: getAddress(address),
      client: client.client,
    })

    const decimals = yield* Effect.tryPromise({
      try: () => inst.read.decimals(),
      catch: () => new RequestModel.ResolveStrategyABIError('local-strategy', address, chainID),
    })

    if (decimals != null) {
      return [
        {
          type: 'address',
          address,
          chainID,
          abi: JSON.stringify(erc20Abi),
        },
      ] as RequestModel.ContractABI[]
    }

    return yield* Effect.fail(new RequestModel.ResolveStrategyABIError('local-strategy', address, chainID))
  })

export const ExperimentalErc20AbiStrategyResolver = (
  service: PublicClient,
): RequestModel.ContractAbiResolverStrategy => {
  return {
    type: 'address',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(getLocalFragments(service, req), 'AbiStrategy.ExperimentalErc20AbiStrategyResolver', {
        attributes: { chainID: req.chainID, address: req.address },
      }),
    ),
  }
}
