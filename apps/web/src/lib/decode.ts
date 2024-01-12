import { Effect, Layer, Runtime, Scope, pipe } from "effect";
import { RPCProviderLive } from "./rpc-provider";
import {
  decodeTransactionByHash,
  type DecodedTx,
} from "@3loop/transaction-decoder";
import { AbiStoreLive, ContractMetaStoreLive } from "./contract-loader";

const LoadersLayer = Layer.mergeAll(AbiStoreLive, ContractMetaStoreLive);
const MainLayer = LoadersLayer.pipe(Layer.provideMerge(RPCProviderLive));

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number;
  hash: string;
}): Promise<DecodedTx | undefined> {
  const runnable = Effect.provide(
    decodeTransactionByHash(hash, chainID),
    MainLayer,
  );
  return Effect.runPromise(runnable).catch((error: unknown) => {
    console.error("Decode error", JSON.stringify(error, null, 2));
    return undefined;
  });
}
