# Loop Decoder

## Requirements

- TypeScript 5.x
- `strict` enabled in your tsconfig.json

## Getting Started

To get started, install the package from npm, along with its peer dependencies:

```
$ npm i @3loop/transaction-decoder
```

To begin using the Loop Decoder, you need to create an instance of the LoopDecoder class. At a minimum, you must provide three data loaders:

- `getPublicClient`: This function returns an object with viem PublicClient based on the chain ID.
- `contractMetaStore`: This object has 2 properties `get` and `set` that returns and caches contract meta-information. See the `ContractData` type for the required properties.
- `abiStore`: Similarly, this object has 2 properties `get` and `set` that returns and cache the contract or fragment ABI based on the chain ID, address, and/or signature.

```ts
import { TransactionDecoder } from '@3loop/transaction-decoder'

const db = {} // Your data source

const decoded = new TransactionDecoder({
    getPublicClient: (chainId: number) => {
        return {
            client: createPublicClient({
                transport: http(RPC_URL[chainId]),
            }),
        }
    },
    abiStore: {
        get: async (req: AbiParams) => {
            return db.getContractAbi(req)
        },
        set: async (req: ContractAbiResult) => {
            await db.setContractAbi(req)
        },
    },
    contractMetaStore: {
        get: async (req: ContractMetaParams) => {
            return db.getContractMeta(req)
        },
        set: async (req: ContractMetaParams, val: ContractMetaResult) {
            await db.setContractMeta(req, val)
        },
    },
})
```

It's important to note that the Loop Decoder does not enforce any specific data source, allowing users of the library to load contract data as they see fit. Depending on the requirements of your application, you can either include the necessary data directly in your code for a small number of contracts or use a database as a cache.

LoopDecoder instances provide a single public method, `decodeTransaction`, which fetches and decodes a given transaction:

```ts
const result = await decoded.decodeTransaction({
  chainID: 1,
  hash: '0x...',
})
```

Feel free to reach out if you have any questions or need further assistance with the Loop Decoder library.

## Advanced Effect API

Loop decoder also exposes [Effect](https://effect.website/) API interfaces.

To get started with using the Decoder, first, you have to provide the RPC Provider and a ContractLoader Service.

1. Create an RPC Provider

```ts
import { PublicClient, PublicClientObject } from '@3loop/transaction-decoder'
import { Effect } from 'effect'

const getPublicClient = (chainID: number): Effect.Effect<PublicClientObject, UnknownNetwork> => {
  if (chainID === 1) {
    return Effect.succeed({
      client: createPublicClient({
        transport: http(ETHEREUM_RPC),
      }),
    })
  }
  return Effect.fail(new UnknownNetwork(chainID))
}
```

2. Create the AbiStore

`AbiStore` serves as a repository for obtaining and caching the contract ABI necessary for decoding transaction data. In a real-world scenario, it may be preferable to retrieve this data from a database. In the following example, we will be hardcoding all the necessary information.

To create a new `AbiStore` service you will need to implement two methods `set` and `get`.

```ts
const AbiStoreLive = Layer.succeed(
  AbiStore,
  AbiStore.of({
    strategies: { default: [] },
    set: (result: ContractAbiResult) =>
      Effect.sync(() => {
        // NOTE: Ignore caching as we relay only on local abis
      }),
    get: ({ address, signature, event, chainID }) =>
      Effect.sync(() => {
        const signatureAbiMap = {
          '0x3593564c': 'execute(bytes,bytes[],uint256)',
          '0x0902f1ac': 'getReserves()',
          '0x36c78516': 'transferFrom(address,address,uint160,address)	',
          '0x70a08231': 'balanceOf(address)',
          '0x022c0d9f': 'swap(uint256,uint256,address,bytes)',
          '0x2e1a7d4d': 'withdraw(uint256)',
        }

        const abi = signatureAbiMap[signature]

        if (abi) {
          return {
            type: 'func',
            abi: `[${abi}]`,
            address,
            chainID: chainID,
            signature,
          }
        }

        return {
          status: 'empty',
          result: null,
        }
      }),
  }),
)
```

3. Create the ContractMetaStore

Similarly to AbiStore, but returns all the contract meta data

```ts
export const MetaStoreLive = Layer.succeed(
    ContractMetaStore,
    ContractMetaStore.of({
        get: ({ address, chainID }) => Effect.sync(() => {
            return {
              status: 'success',
              result: {
                address: request.address,
                chainID: request.chainID,
                contractName: 'Mock Contract',
                contractAddress: request.address,
                tokenSymbol: 'MOCK',
                decimals: 18,
                type: ContractType.ERC20,
              },
            }
        }),
        set: () => Effect.sync(() => {
            // NOTE: Ignore for now
        }),
    })
```

4. Create a context using the services we created above

```ts
const LoadersLayer = Layer.provideMerge(AbiStoreLive, MetaStoreLive)
const PublicClientLive = Layer.succeed(
  PublicClient,
  PublicClient.of({ _tag: 'PublicClient', getPublicClient: getPublicClient }),
)

const MainLayer = Layer.provideMerge(PublicClientLive, LoadersLayer)
```

5. Fetch and decode a transaction

```ts
const program = Effect.gen(function* () {
  const hash = '0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7'
  const chainID = 1

  return yield* decodeTransactionByHash(hash, chainID)
})
```

6. Finally provide the context and run the program

```ts
const customRuntime = pipe(Layer.toRuntime(MainLayer), Effect.scoped, Effect.runSync)
const result = await program.pipe(Effect.provide(customRuntime), Effect.runPromise)
```

## ABI Strategies

`AbiStore` accepts an array of strategies that are used to resolve the ABI from third-party APIs in case the store is missing the ABI. If an ABI is successfully resolved, it is then cached in the store.

Loop Decoder provides 5 strategies out of the box:

- `EtherscanStrategyResolver` - resolves the ABI from Etherscan
- `SourcifyStrategyResolver` - resolves the ABI from Sourcify
- `FourByteStrategyResolver` - resolves the ABI from 4byte.directory
- `OpenchainStrategyResolver` - resolves the ABI from Openchain
- `BlockscoutStrategyResolver` - resolves the ABI from Blockscout

You can create your own strategy by implementing the `GetContractABIStrategy` Effect RequestResolver.

### Release with Changeset

When adding a new feature, please use the [Changeset](https://github.com/changesets/changesets) tool to create a new release. This will automatically update the changelog and create a new release on GitHub.

To create a new changelog, run the following command:

```
$ pnpm changeset
```

To create a new release, one of the maintainers will merge the changeset PR into the main branch. This will trigger a new release to npm.

### Credits

Some ideas for the decoder and interpreter were inspired by open-source software. Special thanks to:

- [EVM Translator](https://github.com/metagame-xyz/evm-translator) - some data types and data manipulations were heavily inspired by this source.
