import {
  ContractData,
  AbiStore,
  ContractMetaStore,
  EtherscanStrategyResolver,
  SourcifyStrategyResolver,
  RPCProvider,
} from "@3loop/transaction-decoder";
import { Effect, Layer } from "effect";
import { fetchAndCacheErc20Meta } from "./contract-meta";
import prisma from "./prisma";

export const AbiStoreLive = Layer.succeed(
  AbiStore,
  AbiStore.of({
    strategies: [
      EtherscanStrategyResolver({
        apikey: process.env.ETHERSCAN_API_KEY,
      }),
      SourcifyStrategyResolver(),
    ],
    set: ({ address = {} }) =>
      Effect.gen(function* (_) {
        const addressMatches = Object.entries(address);

        // Cache all addresses
        yield* _(
          Effect.all(
            addressMatches.map(([key, value]) =>
              Effect.promise(() =>
                prisma.contractAbi.create({
                  data: {
                    address: key.toLowerCase(),
                    abi: value,
                  },
                }),
              ),
            ),
            {
              concurrency: "unbounded",
            },
          ),
        );
      }),
    get: ({ address }) =>
      Effect.gen(function* (_) {
        const normAddress = address.toLowerCase();
        const cached = yield* _(
          Effect.promise(() =>
            prisma.contractAbi.findFirst({
              where: {
                address: normAddress,
              },
            }),
          ),
        );

        if (cached != null) {
          return cached.abi;
        }
        return null;
      }),
  }),
);

// TODO: Provide context of RPCProvider
export const ContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* (_) {
    const rpcProvider = yield* _(RPCProvider);

    return ContractMetaStore.of({
      get: ({ address, chainID }) =>
        Effect.gen(function* (_) {
          const normAddress = address.toLowerCase();
          const data = yield* _(
            Effect.tryPromise(() =>
              prisma.contractMeta.findFirst({
                where: {
                  address: normAddress,
                  chainID: chainID,
                },
              }),
            ).pipe(Effect.catchAll((_) => Effect.succeed(null))),
          );

          if (data != null) {
            return data as ContractData;
          }

          const tryERC20 = yield* _(
            fetchAndCacheErc20Meta({
              contractAddress: normAddress,
              chainID,
            }).pipe(
              Effect.provideService(RPCProvider, rpcProvider),
              Effect.catchAll((_) => Effect.succeed(null)),
            ),
          );

          if (tryERC20 != null) {
            return tryERC20;
          }

          return null;
        }),
      set: () =>
        Effect.sync(() => {
          console.error("Set not implemented for ContractMetaStoreLive");
          return null;
        }),
    });
  }),
);
