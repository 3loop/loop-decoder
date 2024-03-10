---
title: How to decode an Ethereum Transaction
description: On this page you will provide a step-by-step guide on how to decode and interpret an Ethereum transaction using Loop Decoder.
---

In this guide, we will go through the process of decoding an Ethereum transaction using Loop Decoder. For the simplicity of the example, we assume that that contract ABIs involved in the transaction are verified on Etherscan.

We recomend to copy all snipepts to a typescript project and run it at the end of this guide.

## Prerequisites

### Create a new project

Optionally, you can create a new project to follow along, or skip to [Required packages](#required-packages).

1. Generate an empty project using npm:

```bash
mkdir example-decode && cd example-decode
npm init -y
npm install typescript --save-dev
```

2. Initialize typescript:

```bash
npx tsc --init
```

3. Ensure that you have `strict` flag set to `true` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

4. Create a new file `index.ts` where you will add the code snipets from this guide.

5. Add a new script to `package.json`:

```json
{
  "scripts": {
    "start": "tsc && node index.js"
  }
}
```

6. Run the example:

```bash
npm start
```

### Required packages

For this guide, you will need to have the following packages installed:

```bash
npm install @3loop/transaction-decoder ethers
```

## Data Sources

Loop Decoder requires some data sources to be able to decode transactions. We will need an RPC provider, a data source to fetch Contracts ABIs and a data source to fetch contract meta-information, such as token name, decimals, symbol, etc.

### RPC Provider

We will start by creating a function which will return an object with JsonRpcProvider based on the chain ID. For the sake of this example, we will only support mainnet.

```ts
import { JsonRpcProvider } from "ethers";

const getProvider = (chainId: number) => {
  if (chainId !== 1) {
    throw new Error(`Missing RPC provider for chain ID ${chainId}`);
  }

  return { provider: new JsonRpcProvider("https://rpc.ankr.com/eth") };
};
```

### ABI loader

To avoid making unecessary calls to third-party APIs, Loop Decoder uses an API that allows cache. For this example, we will keep it simple and use an in-memory cache. We will also use some strategies to download contract ABIs from Etherscan and 4byte.directory. You can find more information about the strategies in the [Strategies](/reference/abi-loaders/) reference.

Create a cache for contract ABI:

```ts
import { EtherscanStrategyResolver } from "@3loop/transaction-decoder";
const abiCache = new Map<string, string>();

const abiStore = {
  strategies: [
    EtherscanStrategyResolver({
      apikey: "YourApiKeyToken",
    }),
    FourByteStrategyResolver(),
  ],
  get: async (req: {
    chainID: number;
    address: string;
    event?: string | undefined;
    signature?: string | undefined;
  }) => {
    return Promise.resolve(abiCache.get(req.address) ?? null);
  },
  set: async (req: {
    address?: Record<string, string>;
    signature?: Record<string, string>;
  }) => {
    const addresses = Object.keys(req.address ?? {});
    addresses.forEach((address) => {
      abiCache.set(address, req.address?.[address] ?? "");
    });
  },
};
```

### Contract Metadata loader

Create a cache for contract meta-information, such as token name, decimals, symbol, etc.:

```ts
import type { ContractData } from "@3loop/transaction-decoder";
const contractMeta = new Map<string, ContractData>();

const contractMetaStore = {
  get: async (req: { address: string; chainID: number }) => {
    return contractMeta.get(req.address) ?? null;
  },
  set: async (req: { address: string; chainID: number }) => {
    // NOTE: not yet called as we do not have any automatic resolve strategy implemented
  },
};
```

Finally, you can create a new instance of the LoopDecoder class:

```ts
import { TransactionDecoder } from "@3loop/transaction-decoder";

const decoder = new TransactionDecoder({
  getProvider: getProvider,
  abiStore: abiStore,
  contractMetaStore: contractMetaStore,
});
```

## Decoding a Transaction

Now that we have all the necessary components, we can start decoding a transaction. For this example, we will use the following transaction:

```ts
async function main() {
  try {
    const decoded = await decoder.decodeTransaction({
      chainID: 1,
      hash: "0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7",
    });

    console.log(JSON.stringify(decoded, null, 2));
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
}

main();
```
