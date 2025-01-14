---
title: Decoding Transaction with SQLite Data Store
description: An implementation of the Data Store interface using a SQL database based on @effect/sql
sidebar:
  order: 3
---

Loop Decoder provides a built-in SQL Data Stores that can be used out of the box. The key benefits of using the built-in SQL stores are:

- You don't need to write your own database schema, `get` or `set` methods for the [Data Stores](/reference/data-store).
- You will get enhanced performance for decoding transactions by caching the data in the persistent storage.
- You can use any database supported by [`@effect/sql`](https://github.com/Effect-TS/effect/tree/main/packages/sql).

To use the built-in SQL stores you can import `SqlAbiStore` and `SqlContractMetaStore` from the `@3loop/transaction-decoder/sql`.

## Example

In this example we will use a Sqlite client for bun: `SqliteClient` from `@effect/sql-sqlite-bun` package.

The example implements a CLI that will use `Sqlite` as a cache for the ABIs and Contract Metadata stores. It will decode any transaction by chain ID and transaction hash. The more its is used the more data will be cached in the database, thus making it faster to decode transactions.

### Installation

You can add it directly into your project or create a new one.

```shell
mkdir transaction-decoder-cli && cd transaction-decoder-cli && bun init
```

Then install the necessary dependencies:

```shell
bun i viem effect @effect/sql @effect/sql-sqlite-bun @3loop/transaction-decoder
```

### Setup Loop Decoder

Create a `index.ts` file with the following content:

```typescript
import { SqlAbiStore, SqlContractMetaStore } from '@3loop/transaction-decoder/sql'
import {
  decodeTransactionByHash,
  ERC20RPCStrategyResolver,
  EtherscanV2StrategyResolver,
  FourByteStrategyResolver,
  NFTRPCStrategyResolver,
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

const MetaStoreLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const service = yield* PublicClient

    return SqlContractMetaStore.make({
      default: [ERC20RPCStrategyResolver(service), NFTRPCStrategyResolver(service)],
    })
  }),
)
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

### Run the script

Now you can run this script with bun:

```
ETHERSCAN_API_KEY='YOUR_API_KEY' RPC_1=https://rpc.ankr.com/eth bun run index.ts 1 0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7
```
