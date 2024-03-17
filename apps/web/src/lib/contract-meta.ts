import { Effect } from "effect";
import {
  ContractData,
  ContractType,
  PublicClient,
} from "@3loop/transaction-decoder";
import { erc20Abi, getAddress, getContract } from "viem";

export const fetchAndCacheErc20Meta = ({
  contractAddress,
  chainID,
}: {
  contractAddress: string;
  chainID: number;
}) =>
  Effect.gen(function* (_) {
    const service = yield* _(PublicClient);
    const { client } = yield* _(service.getPublicClient(chainID));

    const inst = yield* _(
      Effect.sync(() =>
        getContract({
          address: getAddress(contractAddress),
          abi: erc20Abi,
          client,
        }),
      ),
    );

    const name = yield* _(
      Effect.tryPromise({
        try: () => inst.read.name() as Promise<string | null>,
        catch: () => null,
      }),
    );

    if (name == null) {
      return null;
    }

    const [symbol, decimals] = yield* _(
      Effect.all(
        [
          Effect.tryPromise({
            try: () => inst.read.symbol() as Promise<string>,
            catch: () => null,
          }),
          Effect.tryPromise({
            try: () => inst.read.decimals() as Promise<number>,
            catch: () => null,
          }),
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
