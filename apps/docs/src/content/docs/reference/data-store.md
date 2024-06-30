---
title: Data Store
description: Data Storages are simple APIs that implement a key-value store for persistent cache.
sidebar:
  order: 1
---

Loop decoder relays on two data stores for caching the ABI and contract metadata. The user of the library is free to choose which data layer to use depending on their environment and requirements.

If your application is designed to decode a fixed subset of contracts, you can provide a hardcoded map of ABIs and contract metadata. For more flexible applications, you can use any persistent database. When running in a browser, you can implement a REST API to fetch the ABIs and contract metadata from a server.

A store also requires a set of strategies that we cover separately in the [Data Loaders](../data-loaders) section.

## AbiStore

ABI Store Interface requires 2 methods `set` and `get` to store and retrieve the ABI of a contract. Optionally you can provide a batch get method `getMany` for further optimization. Because our API supports ABI fragments, the get method will receive both the contract address and the fragment signature.

```typescript
interface AbiParams {
  chainID: number
  address: string
  event?: string | undefined // event signature
  signature?: string | undefined // function signature
}
```

The `set` method will receive a key of the type `AbiParams` and and `ContractAbiResult`. You can choose to store the data in the best format that fits your database.

```typescript
interface FunctionFragmentABI {
  type: 'func'
  abi: string
  address: string
  chainID: number
  signature: string
}

interface EventFragmentABI {
  type: 'event'
  abi: string
  address: string
  chainID: number
  event: string
}

interface AddressABI {
  type: 'address'
  abi: string
  address: string
  chainID: number
}

export type ContractABI = FunctionFragmentABI | EventFragmentABI | AddressABI

export interface ContractAbiSuccess {
  status: 'success'
  result: ContractABI
}

export interface ContractAbiNotFound {
  status: 'not-found'
  result: null
}

export interface ContractAbiEmpty {
  status: 'empty'
  result: null
}

export type ContractAbiResult = ContractAbiSuccess | ContractAbiNotFound | ContractAbiEmpty
```

The full interface looks as follows:

```typescript
export interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractABIStrategy>[]>
  readonly set: (key: AbiParams, value: ContractAbiResult) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>
}
```

## ContractMetadataStore

Similar to the ABI Store, the Contract Metadata Store Interface requires 2 methods `set`, `get`, and optionally `getMany` to store and retrieve the contract metadata.

The `get` method will receive the contract address and the chain ID as input.

```typescript
interface ContractMetaParams {
  address: string
  chainID: number
}
```

And, the `set` method will be called with 2 pramaters, the key in the same format as the `get` method, and the metadata in a format of `ContractMetaResult`.

```typescript
interface ContractMetaSuccess {
  status: 'success'
  result: ContractData
}

interface ContractMetaNotFound {
  status: 'not-found'
  result: null
}

interface ContractMetaEmpty {
  status: 'empty'
  result: null
}

export type ContractMetaResult = ContractMetaSuccess | ContractMetaNotFound | ContractMetaEmpty
```

Contract metadata is a map of the following interface:

```typescript
export interface ContractData {
  address: string
  contractName: string
  contractAddress: string
  tokenSymbol: string
  decimals?: number
  type: ContractType
  chainID: number
}
```

The full interface looks as follows:

```typescript
interface ContractMetaStore {
  readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractMetaStrategy>[]>
  readonly set: (arg: ContractMetaParams, value: ContractMetaResult) => Effect.Effect<void, never>
  readonly get: (arg: ContractMetaParams) => Effect.Effect<ContractMetaResult, never>
  readonly getMany?: (arg: Array<ContractMetaParams>) => Effect.Effect<Array<ContractMetaResult>, never>
}
```

You can notice that the `AbiStore` and `ContractMetadataStore` interfaces are very similar, and both have a status for the set and get methods. Both stores can return three states:

1.  `success` - The requested data is found in the store.
2.  `not-found` - The requested data is found in the store, but is missing a value. This means that we have tried to resolve it from a third party, but it was missing there.
3.  `empty` - The requested data is not found in the store, which means that it has never been requested before.

We have two states that can return an empty result. We want to be able to skip the meta strategy in cases where we know it's not available, as this can significantly reduce the number of requests to the strategies and improve performance.

Some strategies may be able to add the data later. Therefore, we encourage storing a timestamp and removing the "not-found" state to be able to check again.
