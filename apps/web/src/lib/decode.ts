import { Effect, Layer } from "effect";
import { RPCProviderLive } from "./rpc-provider";
import {
  decodeTransactionByHash,
  type DecodedTx,
} from "@3loop/transaction-decoder";
import { AbiStoreLive, ContractMetaStoreLive } from "./contract-loader";
import { Hex } from "viem";

const LoadersLayer = Layer.mergeAll(AbiStoreLive, ContractMetaStoreLive);
const MainLayer = LoadersLayer.pipe(Layer.provideMerge(RPCProviderLive));

export async function decodeTransaction({
  chainID,
  hashes,
}: {
  chainID: number;
  hashes: string[];
}): Promise<DecodedTx[] | undefined> {
  const program = Effect.gen(function* (_) {
    return yield* _(
      Effect.all(
        hashes.map((hash) => decodeTransactionByHash(hash as Hex, chainID)),
        {
          concurrency: "unbounded",
        },
      ),
    );
  });

  const runnable = Effect.provide(program, MainLayer).pipe(
    Effect.timeout(9000),
  );

  return Effect.runPromise(runnable).catch((error: unknown) => {
    console.error("Decode error", JSON.stringify(error, null, 2));
    return undefined;
  });
}
