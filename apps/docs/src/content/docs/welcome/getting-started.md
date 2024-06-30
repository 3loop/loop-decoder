---
title: Getting Started
description: Quick start guide on using the Loop Decoder
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

1. `getPublicClient`: This function returns an object with [Viem](https://viem.sh/) `PublicClient` based on the chain ID.

```ts
const getPublicClient = (chainId: number) => {
  return {
    client: createPublicClient({
      transport: http(RPC_URL[chainId]),
    }),
  }
}
```

2. `contractMetaStore`: This object has two required properties, `get` and `set`, which return and cache contract meta-information. Optionally, you can provide a list of `strategies` that will resolve data when it is missing in the cache. See the `ContractData` type for the required properties of the contract meta-information.

```ts
const db = new Map()

const contractMetaStore: VanillaContractMetaStore = {
  strategies: [], // NOTE: We will cover stragies later
  get: async ({ address, chainID }) => {
    const key = `${address}-${chainID}`
    if (db.has(key)) {
      return {
        status: 'success',
        result: db.get(key),
      }
    }
    return {
      status: 'empty',
      result: null,
    }
  },
  set: async ({ address, chainID }, result) => {
    const key = `${address}-${chainID}`

    if (result.status === 'success') {
      db.set(key, result.result)
    }
  },
}
```

1. `abiStore`: Similarly, this object has two required properties, `get` and `set`, which return and cache the contract or fragment ABI based on the chain ID, address, function, or event signature. Additionally, it includes strategies to resolve the data from third parties when it is missing in the cache.

In the following example we will cache all types of ABIs into the same Map.

```ts
const db = new Map()

const abiStore: VanillaAbiStore = {
  strategies: [], // NOTE: We will cover stragies later
  get: async ({ address, event, signature }) => {
    if (db.has(address)) {
      return {
        status: 'success',
        result: db.get(address),
      }
    } else if (event != null && db.has(event)) {
      return {
        status: 'success',
        result: db.get(event),
      }
    } else if (signature != null && db.has(signature)) {
      return {
        status: 'success',
        result: db.get(signature),
      }
    }

    return {
      status: 'empty',
      result: null,
    }
  },
  set: async (_key, value) => {
    if (value.status === 'success') {
      if (value.result.type === 'address') {
        db.set(value.result.address, value.result)
      } else if (value.result.type === 'event') {
        db.set(value.result.event, value.result)
      } else if (value.result.type === 'func') {
        db.set(value.result.signature, value.result)
      }
    }
  },
}
```

Finally, you can create a new instance of the LoopDecoder class:

```ts
import { TransactionDecoder } from '@3loop/transaction-decoder'

const decoded = new TransactionDecoder({
  getProvider: getPublicClient,
  abiStore: abiStore,
  contractMetaStore: contractMetaStore,
})
```

It's important to note that the Loop Decoder does not enforce any specific data source, allowing users of the library to load contract data as they see fit. Depending on the requirements of your application, you can either include the necessary data directly in your code for a small number of contracts or use a database as a cache.

LoopDecoder instances provide a public method, `decodeTransaction`, which fetches and decodes a given transaction:

```ts
const result = await decoded.decodeTransaction({
  chainID: 1,
  hash: '0x...',
})
```
