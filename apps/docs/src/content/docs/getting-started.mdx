---
title: Getting Started
description: A guide in my new Starlight docs site.
---

### Requirements

- TypeScript 5.x
- `exactOptionalPropertyTypes` and `strict` enabled in your tsconfig.json

### Dependencies

To get started, install the package from npm, along with its peer dependencies:

```sh
npm i @3loop/transaction-decoder
```

### Quick Start

To begin using the Loop Decoder, you need to create an instance of the LoopDecoder class. At a minimum, you must provide three data loaders:

1. `getProvider`: This function returns an object with [Ethers](https://ethers.org) `JsonRpcProvider` based on the chain ID.

```ts
const getProvider = (chainId: number) => {
  return { provider: new JsonRpcProvider(RPC_URL[chainId]) };
};
```

2. `contractMetaStore`: This object has 2 properties `get` and `set` that returns and caches contract meta-information. See the `ContractData` type for the required properties.

```ts
const db = {}; // Your data source

const contractMetaStore = {
  get: async (req: {
    address: string
    chainID: number
  }) => {
    return db.getContractMeta(req)
  },
  set: async (req: {
    address: string
    chainID: number
  }) {
    // NOTE: not yet called as we do not have any automatic resolve strategy implemented
  },
}
```

3. `abiStore`: Similarly, this object has 2 properties `get` and `set` that returns and cache the contract or fragment ABI based on the chain ID, address, and/or signature.

```ts
const db = {}; // Your data source

const abiStore = {
  get: async (req: {
    chainID: number;
    address: string;
    event?: string | undefined;
    signature?: string | undefined;
  }) => {
    return db.getContractAbi(req);
  },
  set: async (req: {
    address?: Record<string, string>;
    signature?: Record<string, string>;
  }) => {
    await db.setContractAbi(req);
  },
};
```

Finally, you can create a new instance of the LoopDecoder class:

```ts
import { TransactionDecoder } from "@3loop/transaction-decoder";

const decoded = new TransactionDecoder({
  getProvider: getProvider,
  abiStore: abiStore,
  contractMetaStore: contractMetaStore,
});
```

It's important to note that the Loop Decoder does not enforce any specific data source, allowing users of the library to load contract data as they see fit. Depending on the requirements of your application, you can either include the necessary data directly in your code for a small number of contracts or use a database as a cache.

LoopDecoder instances provide a public method, `decodeTransaction`, which fetches and decodes a given transaction:

```ts
const result = await decoded.decodeTransaction({
  chainID: 5,
  hash: "0x...",
});
```
