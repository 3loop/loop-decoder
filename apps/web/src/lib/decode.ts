import { Effect, Layer, pipe } from "effect";
import { RPCProviderLive } from "./rpc-provider";
import {
  decodeTransactionByHash,
  type DecodedTx,
} from "@3loop/transaction-decoder";
import { AbiStoreLive, ContractMetaStoreLive } from "./contract-loader";

const LoadersLayer = Layer.provideMerge(AbiStoreLive, ContractMetaStoreLive);
const MainLayer = Layer.provideMerge(RPCProviderLive, LoadersLayer);

const customRuntime = pipe(
  Layer.toRuntime(MainLayer),
  Effect.scoped,
  Effect.runSync,
);

export async function decodeTransaction({
  chainID,
  hash,
}: {
  chainID: number;
  hash: string;
}): Promise<DecodedTx | undefined> {
  return decodeTransactionByHash(hash, chainID)
    .pipe(Effect.provideSomeRuntime(customRuntime), Effect.runPromise)
    .catch((error: unknown) => {
      console.error("Decode error", JSON.stringify(error, null, 2));
      return undefined;
    });
}
