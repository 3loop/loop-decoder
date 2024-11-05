---
title: SQL Data Store
description: An implementation of the Data Store interface using a SQL database based on @effect/sql
sidebar:
  order: 4
---

To use the default SQL stores you can import `SqlAbiStore` and `ContractStore ` from the `@3loop/transaction-decoder/sql`.

Given that the SQL stores are based on `@effect/sql` it inherits its SQL Client abstraction. For example we will use a Sqlite client for bun: `SqliteClient` from `@effect/sql-sqlite-bun` package.

### Example

This example implements a CLI that will use Sqlite as a cache for the ABIs and Contract Metadata stores. It will decode any transaction by chain id an transaction hash. The more its is used the more data will be cached in the database, thus making it faster to decode transactions.

You can add it directly into your project or create a new one.

```shell
$ mkdir transaction-decoder-cli && cd transaction-decoder-cli && bun init
```

We will start by installing the necessary dependencies:

```shell
$ bun i viem effect @effect/sql @effect/sql-sqlite-bun @3loop/transaction-decoder
```

Then we will create a `index.ts` file with the following content:

```typescript
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import {
  decodeTransactionByHash,
  EtherscanV2StrategyResolver,
  FourByteStrategyResolver,
  PublicClient,
} from '@3loop/transaction-decoder'
import { SqliteClient } from '@effect/sql-sqlite-bun'
import { Effect, Layer } from 'effect'
import { createPublicClient, http, type Hex } from 'viem'

const AbiStoreLive = SqlAbiStore.make({
  default: [
    EtherscanV2StrategyResolver({
      apikey: process.env.ETHERSCAN_API_KEY,
    }),
    FourByteStrategyResolver(),
  ],
})

const SqlLive = SqliteClient.layer({
  filename: 'db.sqlite',
})

export const RPCProviderLive = Layer.succeed(
  PublicClient,
  PublicClient.of({
    _tag: 'PublicClient',
    getPublicClient: (chainID: number) => {
      return Effect.succeed({
        client: createPublicClient({
          transport: http(process.env[`RPC_${chainID}`]),
        }),
        config: {
          traceAPI: 'none',
        },
      })
    },
  }),
)

const MetaStoreLive = SqlContractMetaStore.make()
const DataLayer = Layer.mergeAll(RPCProviderLive, SqlLive)
const LoadersLayer = Layer.mergeAll(AbiStoreLive, MetaStoreLive)
const MainLayer = Layer.provideMerge(LoadersLayer, DataLayer)

function main() {
  const [, , chainID, hash] = Bun.argv

  const runnable = Effect.provide(decodeTransactionByHash(hash as Hex, Number(chainID)), MainLayer)

  Effect.runPromise(runnable)
    .then(console.log)
    .catch((error: unknown) => {
      console.error('Decode error', JSON.stringify(error, null, 2))
      return undefined
    })
}

main()
```

Now you can run this script with bun:

```
$ bun run index.ts 1 0x123transactionhash
```
