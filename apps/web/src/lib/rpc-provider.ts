import { RPCProvider, UnknownNetwork } from "@3loop/transaction-decoder";
import { JsonRpcProvider } from "ethers";
import { Layer, Effect } from "effect";
import { supportedChains } from "@/app/data";

const urls: Record<number, string> = supportedChains.reduce(
  (acc, { chainID, rpcUrl }) => {
    return {
      ...acc,
      [chainID]: rpcUrl,
    };
  },
  {},
);

const providers: Record<number, JsonRpcProvider> = {};

export function getProvider(chainID: number): JsonRpcProvider | null {
  let provider = providers[chainID];
  if (provider != null) {
    return provider;
  }

  const url = urls[chainID];
  if (url != null) {
    provider = new JsonRpcProvider(url);
    providers[chainID] = provider;
    return provider;
  }

  return null;
}

export const RPCProviderLive = Layer.succeed(
  RPCProvider,
  RPCProvider.of({
    _tag: "RPCProvider",
    getProvider: (chainID: number) => {
      const provider = getProvider(chainID);
      if (provider != null) {
        return Effect.succeed(provider);
      }
      return Effect.fail(new UnknownNetwork(chainID));
    },
  }),
);
