import * as RequestModel from './request-model.js'
import { Effect } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc20Abi, getAddress, getContract } from 'viem'

const getLocalFragments = (service: PublicClient, { address, chainId }: RequestModel.GetContractABIStrategyParams) =>
  Effect.gen(function* () {
    if (!address)
      return yield* Effect.fail(
        new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId, 'Address is required'),
      )

    const client = yield* service
      .getPublicClient(chainId)
      .pipe(
        Effect.catchAll((e) =>
          Effect.fail(new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId, String(e))),
        ),
      )

    const inst = yield* Effect.try({
      try: () =>
        getContract({
          abi: erc20Abi,
          address: getAddress(address),
          client: client.client,
        }),
      catch: (e) => new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId, String(e)),
    })

    const decimals = yield* Effect.tryPromise({
      try: () => inst.read.decimals(),
      catch: (e) => new RequestModel.ResolveStrategyABIError('local-strategy', address, chainId, String(e)),
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

    // Contract exists but is not an ERC20 token - this is a "no data found" case
    return yield* Effect.fail(
      new RequestModel.MissingABIStrategyError(
        address,
        chainId,
        'experimental-erc20-strategy',
        undefined,
        undefined,
        'Contract is not an ERC20 token',
      ),
    )
  })

export const ExperimentalErc20AbiStrategyResolver = (
  service: PublicClient,
): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'experimental-erc20-strategy',
    type: 'address',
    resolver: (req: RequestModel.GetContractABIStrategyParams) =>
      Effect.withSpan(getLocalFragments(service, req), 'AbiStrategy.ExperimentalErc20AbiStrategyResolver', {
        attributes: { chainId: req.chainId, address: req.address },
      }),
  }
}
