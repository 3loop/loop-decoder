import {
  RPCProvider,
  UnknownNetwork,
  RPCProviderObject,
} from "@3loop/transaction-decoder";
import { JsonRpcProvider } from "ethers";
import { Layer, Effect } from "effect";
import { supportedChains } from "@/app/data";

const providerConfigs = supportedChains.reduce((acc, config) => {
  return {
    ...acc,
    [config.chainID]: config,
  };
}, {});

const providers: Record<number, RPCProviderObject> = {};

export function getProvider(chainID: number): RPCProviderObject | null {
  let provider = providers[chainID];
  if (provider != null) {
    return provider;
  }
  const url = providerConfigs[chainID]?.rpcUrl;

  if (url != null) {
    const batchMaxCount = providerConfigs[chainID]?.batching ? 100 : 1;

    provider = {
      provider: new JsonRpcProvider(url, undefined, {
        batchMaxCount: batchMaxCount,
      }),
      config: {
        supportTraceAPI: providerConfigs[chainID]?.supportTraceAPI,
      },
    };

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
