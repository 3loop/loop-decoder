import {
  ContractData,
  AbiStore,
  ContractMetaStore,
  EtherscanStrategyResolver,
  SourcifyStrategyResolver,
  FourByteStrategyResolver,
  OpenchainStrategyResolver,
  BlockscoutStrategyResolver,
  PublicClient,
  ERC20RPCStrategyResolver,
} from '@3loop/transaction-decoder'
import { Effect, Layer } from 'effect'
import prisma from './prisma'
import { NFTRPCStrategyResolver } from '@3loop/transaction-decoder'

export const AbiStoreLive = Layer.succeed(
  AbiStore,
  AbiStore.of({
    strategies: {
      default: [SourcifyStrategyResolver(), OpenchainStrategyResolver(), FourByteStrategyResolver()],
      1: [
        EtherscanStrategyResolver({
          apikey: process.env.ETHERSCAN_API_KEY,
        }),
      ],
      8453: [
        EtherscanStrategyResolver({
          apikey: process.env.BASESCAN_API_KEY,
        }),
      ],
      169: [
        BlockscoutStrategyResolver({
          endpoint: 'https://pacific-explorer.manta.network/api',
        }),
      ],
    },
    set: (_key, value) =>
      Effect.gen(function* () {
        if (value.status !== 'success' || value.result.type !== 'address') {
          // TODO: Store it to avoid fetching again
          return
        }

        yield* Effect.promise(() =>
          prisma.contractAbi
            .create({
              data: {
                address: value.result.address.toLowerCase(),
                abi: value.result.abi,
              },
            })
            .catch((e) => {
              console.error('Failed to cache abi', e)
              return null
            }),
        )
      }),
    get: ({ address, chainID }) =>
      Effect.gen(function* () {
        const normAddress = address.toLowerCase()
        const cached = yield* Effect.promise(() =>
          prisma.contractAbi.findFirst({
            where: {
              address: normAddress,
            },
          }),
        )

        if (cached != null) {
          return {
            status: 'success',
            result: {
              type: 'address',
              address: address,
              abi: cached.abi,
              chainID: chainID,
            },
          }
        }

        return {
          status: 'empty',
          result: null,
        }
      }),
  }),
)

// TODO: Provide context of RPCProvider
export const ContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* () {
    const publicClient = yield* PublicClient
    const erc20Loader = ERC20RPCStrategyResolver(publicClient)
    const nftLoader = NFTRPCStrategyResolver(publicClient)

    return ContractMetaStore.of({
      strategies: {
        default: [erc20Loader, nftLoader],
      },
      get: ({ address, chainID }) =>
        Effect.gen(function* () {
          const normAddress = address.toLowerCase()
          const data = yield* Effect.tryPromise(
            () =>
              prisma.contractMeta.findFirst({
                where: {
                  address: normAddress,
                  chainID: chainID,
                },
              }) as Promise<ContractData | null>,
          ).pipe(Effect.catchAll((_) => Effect.succeed(null)))

          if (data == null) {
            return {
              status: 'empty',
              result: null,
            }
          } else {
            return {
              status: 'success',
              result: data,
            }
          }
        }),
      set: ({ address, chainID }, contractMeta) =>
        Effect.gen(function* () {
          const normAddress = address.toLowerCase()

          if (contractMeta.result == null) {
            // TODO: Store it to avoid fetching again
            return
          }

          yield* Effect.tryPromise(() =>
            prisma.contractMeta.create({
              data: {
                ...contractMeta.result,
                decimals: contractMeta.result.decimals ?? 0,
                address: normAddress,
                chainID: chainID,
              },
            }),
          ).pipe(Effect.catchAll((_) => Effect.succeed(null)))
        }),
    })
  }),
)
