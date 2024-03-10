---
title: ERC20 Contract Metadata
description: On this page you will provide a step-by-step guide on how to fetch ERC20 contract metadata to use with Loop Decoder.
---

## Code

Fetch ERC20 contract metadata using Effect API

```ts
import { Effect, Layer } from "effect";
import { Contract } from "ethers";
import {
  ContractData,
  ContractType,
  RPCProvider,
  ContractMetaStore,
} from "@3loop/transaction-decoder";

const ERC20 = "here goes the abi";

export const fetchAndCacheErc20Meta = ({
  contractAddress,
  chainID,
}: {
  contractAddress: string;
  chainID: number;
}) =>
  Effect.gen(function* (_) {
    const rpcService = yield* _(RPCProvider);
    const { provider } = yield* _(rpcService.getProvider(chainID));

    const inst = yield* _(
      Effect.sync(() => new Contract(contractAddress, ERC20, provider)),
    );

    const name = yield* _(
      Effect.tryPromise(() => inst.name() as Promise<string | null>),
    );

    if (name == null) {
      return null;
    }

    const [symbol, decimals] = yield* _(
      Effect.all(
        [
          Effect.tryPromise(() => inst.symbol() as Promise<string>),
          Effect.tryPromise(() => inst.decimals() as Promise<number>),
        ],
        {
          concurrency: "unbounded",
        },
      ),
    );

    if (symbol == null || decimals == null) {
      return null;
    }

    const meta: ContractData = {
      address: contractAddress,
      contractAddress,
      contractName: name,
      tokenSymbol: symbol,
      decimals: Number(decimals),
      type: "ERC20" as ContractType,
      chainID,
    };

    return meta;
  });

export const ContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* (_) {
    const rpcProvider = yield* _(RPCProvider);

    return ContractMetaStore.of({
      get: ({ address, chainID }) =>
        Effect.gen(function* (_) {
          const normAddress = address.toLowerCase();

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
      set: () => Effect.sync(() => null),
    });
  }),
);
```
