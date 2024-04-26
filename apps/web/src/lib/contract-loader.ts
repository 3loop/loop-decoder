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
      default: [
        EtherscanStrategyResolver({
          apikey: process.env.ETHERSCAN_API_KEY,
        }),
        SourcifyStrategyResolver(),
        OpenchainStrategyResolver(),
        FourByteStrategyResolver(),
      ],
      169: [
        BlockscoutStrategyResolver({
          endpoint: 'https://pacific-explorer.manta.network/api',
        }),
      ],
    },
    set: ({ address = {} }) =>
      Effect.gen(function* () {
        const addressMatches = Object.entries(address)

        // Cache all addresses
        yield* Effect.all(
          addressMatches.map(([key, value]) =>
            Effect.promise(() =>
              prisma.contractAbi
                .create({
                  data: {
                    address: key,
                    abi: value,
                  },
                })
                .catch((e) => {
                  console.error('Failed to cache abi', e)
                  return null
                }),
            ),
          ),
          {
            concurrency: 'inherit',
            batching: 'inherit',
          },
        )
      }),
    get: ({ address }) =>
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
          return cached.abi
        }
        return null
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

          return data
        }),
      set: ({ address, chainID }, contractMeta) =>
        Effect.gen(function* () {
          const normAddress = address.toLowerCase()

          yield* Effect.tryPromise(() =>
            prisma.contractMeta.create({
              data: {
                ...contractMeta,
                decimals: contractMeta.decimals ?? 0,
                address: normAddress,
                chainID: chainID,
              },
            }),
          ).pipe(Effect.catchAll((_) => Effect.succeed(null)))
        }),
    })
  }),
)
