import { Effect } from "effect";
import { Contract } from "ethers";
import { ERC20 } from "./contracts";
import {
  ContractData,
  ContractType,
  RPCProvider,
} from "@3loop/transaction-decoder";

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
      Effect.tryPromise({
        try: () => inst.name() as Promise<string | null>,
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
            try: () => inst.symbol() as Promise<string>,
            catch: () => null,
          }),
          Effect.tryPromise({
            try: () => inst.decimals() as Promise<number>,
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
