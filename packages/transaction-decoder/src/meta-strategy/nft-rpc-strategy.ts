import { ContractData, ContractType } from '@/types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'
import { PublicClient } from '../public-client.js'
import { erc721Abi, getContract } from 'viem'
import { ERC1155InterfaceId, ERC721InterfaceId, erc165Abi } from './constants.js'

export const NFTRPCStrategyResolver = (publicClientLive: PublicClient) =>
    RequestResolver.fromEffect(({ chainID, address }: RequestModel.GetContractMetaStrategy) =>
        Effect.gen(function* (_) {
            const service = yield* _(PublicClient)
            const { client } = yield* _(service.getPublicClient(chainID))

            const inst = getContract({
                abi: erc165Abi,
                address,
                client,
            })

            const fail = new RequestModel.ResolveStrategyMetaError('NFTRPCStrategy', address, chainID)

            const [isERC721, isERC1155] = yield* _(
                Effect.all(
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
                ),
            )

            if (!isERC721 && !isERC1155) return yield* _(Effect.fail(fail))

            const erc721inst = getContract({
                abi: erc721Abi,
                address,
                client,
            })

            const [name, symbol] = yield* _(
                Effect.all(
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
                ),
            )

            const type: ContractType = isERC1155 ? 'ERC1155' : 'ERC721'

            const meta: ContractData = {
                address,
                contractAddress: address,
                contractName: name,
                tokenSymbol: symbol,
                type,
                chainID,
            }

            return meta
        }),
    ).pipe(
        RequestResolver.contextFromServices(PublicClient),
        Effect.provideService(PublicClient, publicClientLive),
        Effect.runSync,
    )
