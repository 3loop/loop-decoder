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

The `set` method will receive a map of ABIs indexed by the contract address, event signature, and function signature. You can choose to store the data in the best format that fits your database.

```typescript
type Address = string
type Signature = string
type ABI = string // JSON stringified ABI

interface ContractABI {
  address?: Record<Address, ABI>
  func?: Record<Signature, ABI>
  event?: Record<Signature, ABI>
}
```

The full interface looks as follows:

```typescript
interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly RequestResolver.RequestResolver<GetContractABIStrategy>[]>
  readonly set: (value: ContractABI) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<string | null, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<string | null>, never>
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

And, the `set` method will be called with 2 pramaters, the key in the same format as the `get` method, and the metadata value.

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
  readonly set: (arg: ContractMetaParams, value: ContractData) => Effect.Effect<void, never>
  readonly get: (arg: ContractMetaParams) => Effect.Effect<ContractData | null, never>
  readonly getMany?: (arg: Array<ContractMetaParams>) => Effect.Effect<Array<ContractData | null>, never>
}
```
