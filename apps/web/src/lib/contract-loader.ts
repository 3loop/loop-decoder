import {
  ContractData,
  ContractLoader,
  GetContractABI,
  GetContractMeta,
  MissingABIError,
  MissingContractMetaError,
  RPCProvider,
} from "@3loop/transaction-decoder";
import { Effect, Layer, RequestResolver, pipe } from "effect";
import { fetchAndCacheErc20Meta } from "./contract-meta";
import { fetchContractABI } from "./etherscan";
import prisma from "./prisma";

const contractABIResolver = RequestResolver.fromFunctionEffect(
  ({ address, signature, chainID }: GetContractABI) =>
    Effect.gen(function* (_) {
      const normAddress = address.toLowerCase();
      const cached = yield* _(
        Effect.tryPromise({
          try: () =>
            prisma.contractAbi.findFirst({
              where: {
                address: normAddress,
              },
            }),
          catch: () => new MissingABIError(normAddress, signature),
        }),
      );

      if (cached != null) {
        return cached.abi;
      }

      const etherscan = yield* _(
        Effect.tryPromise({
          try: () => fetchContractABI(normAddress, chainID),
          catch: () => new MissingABIError(normAddress, signature),
        }),
      );

      if (etherscan == null) {
        return yield* _(
          Effect.fail(new MissingABIError(normAddress, signature)),
        );
      } else {
        yield* _(
          Effect.tryPromise({
            try: () =>
              prisma.contractAbi.create({
                data: {
                  address: normAddress,
                  abi: etherscan,
                },
              }),
            catch: () => new MissingABIError(normAddress, signature),
          }),
        );

        return etherscan;
      }
    }),
);

const contractMetaResolver = RequestResolver.fromFunctionEffect(
  ({ address, chainID }: GetContractMeta) =>
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
        fetchAndCacheErc20Meta({ contractAddress: normAddress, chainID }).pipe(
          Effect.catchAll((_) => Effect.succeed(null)),
        ),
      );

      if (tryERC20 != null) {
        return tryERC20;
      }

      return yield* _(
        Effect.fail(new MissingContractMetaError(normAddress, chainID)),
      );
    }),
);

export const ContractLoaderLive = Layer.effect(
  ContractLoader,
  Effect.gen(function* (_) {
    return ContractLoader.of({
      _tag: "ContractLoader",
      contractABIResolver: yield* _(
        pipe(
          contractABIResolver,
          RequestResolver.contextFromServices(RPCProvider),
        ),
      ),
      contractMetaResolver: yield* _(
        pipe(
          contractMetaResolver,
          RequestResolver.contextFromServices(RPCProvider),
        ),
      ),
    });
  }),
);
