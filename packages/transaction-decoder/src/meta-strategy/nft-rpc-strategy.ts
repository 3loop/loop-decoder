import { ContractData, ContractType } from '../types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc721Abi, getContract } from 'viem'
import { ERC1155InterfaceId, ERC721InterfaceId, erc165Abi } from './constants.js'

export const NFTRPCStrategyResolver = (publicClientLive: PublicClient): RequestModel.ContractMetaResolverStrategy => ({
  id: 'nft-rpc-strategy',
  resolver: RequestResolver.fromEffect(({ chainId, address }: RequestModel.GetContractMetaStrategy) =>
    Effect.gen(function* () {
      const service = yield* PublicClient
      const { client } = yield* service.getPublicClient(chainId)

      // const proxyResult = yield* getProxyStorageSlot({ address, chainID })
      // const { address: implementationAddress } = proxyResult ?? {}
      const contractAddress = address

      const inst = getContract({
        abi: erc165Abi,
        address: contractAddress,
        client,
      })

      const fail = new RequestModel.ResolveStrategyMetaError('NFTRPCStrategy', contractAddress, chainId)

      const [isERC721, isERC1155] = yield* Effect.all(
        [
          Effect.tryPromise({
            try: () => inst.read.supportsInterface([ERC721InterfaceId]),
            catch: () => fail,
          }),
          Effect.tryPromise({
            try: () => inst.read.supportsInterface([ERC1155InterfaceId]),
            catch: () => fail,
          }),
        ],
        {
          concurrency: 'inherit',
          batching: 'inherit',
        },
      )

      if (!isERC721 && !isERC1155) return yield* Effect.fail(fail)

      const erc721inst = getContract({
        abi: erc721Abi,
        address: contractAddress,
        client,
      })

      const [name, symbol] = yield* Effect.all(
        [
          Effect.tryPromise({
            try: () => erc721inst.read.name(),
            catch: () => fail,
          }),
          Effect.tryPromise({
            try: () => erc721inst.read.symbol(),
            catch: () => fail,
          }),
        ],
        {
          concurrency: 'inherit',
          batching: 'inherit',
        },
      )

      const type: ContractType = isERC1155 ? 'ERC1155' : 'ERC721'

      const meta: ContractData = {
        address,
        contractAddress: address,
        contractName: name,
        tokenSymbol: symbol,
        type,
        chainID: chainId,
      }

      return meta
    }).pipe(Effect.withSpan('MetaStrategy.NFTRPCStrategyResolver', { attributes: { chainId, address } })),
  ).pipe(
    RequestResolver.contextFromServices(PublicClient),
    Effect.provideService(PublicClient, publicClientLive),
    Effect.runSync,
  ),
})
