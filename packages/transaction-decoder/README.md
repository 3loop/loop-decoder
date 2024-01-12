# Loop Decoder

## Requirements

-   TypeScript 5.x
-   `strict` enabled in your tsconfig.json

## Getting Started

To get started, install the package from npm, along with its peer dependencies:

```
$ npm i @3loop/transaction-decoder
```

To begin using the Loop Decoder, you need to create an instance of the LoopDecoder class. At a minimum, you must provide three data loaders:

-   `getProvider`: This function returns an object with ethers JsonRpcProvider based on the chain ID.
-   `contractMetaStore`: This object has 2 properties `get` and `set` that returns and caches contract meta-information. See the `ContractData` type for the required properties.
-   `abiStore`: Similarly, this object has 2 properties `get` and `set` that returns and cache the contract or fragment ABI based on the chain ID, address, and/or signature.

```ts
import { TransactionDecoder } from '@3loop/transaction-decoder'

const db = {} // Your data source

const decoded = new TransactionDecoder({
    getProvider: (chainId: number) => {
        return {provider: new JsonRpcProvider(RPC_URL[chainId])}
    },
    abiStore: {
        get: async (req: {
            chainID: number
            address: string
            event?: string | undefined
            signature?: string | undefined
        }) => {
            return db.getContractAbi(req)
        },
        set: async (req: {
            address?: Record<string, string>
            signature?: Record<string, string>
        }) => {
            await db.setContractAbi(req)
        },
    },
    contractMetaStore: {
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
            // NOTE: not yet called as we do not have any automatic resolve strategy
        },
    },
})
```

It's important to note that the Loop Decoder does not enforce any specific data source, allowing users of the library to load contract data as they see fit. Depending on the requirements of your application, you can either include the necessary data directly in your code for a small number of contracts or use a database as a cache.

LoopDecoder instances provide a single public method, `decodeTransaction`, which fetches and decodes a given transaction:

```ts
const result = await decoded.decodeTransaction({
    chainID: 5,
    hash: '0x...',
})
```

Feel free to reach out if you have any questions or need further assistance with the Loop Decoder library.

## Advanced Effect API

Loop decoder also exposes [Effect](https://effect.website/) API interfaces.

To get started with using the Decoder, first, you have to provide the RPC Provider and a ContractLoader Service.

1. Create an RPC Provider

```ts
import { RPCProviderObject } from 'ethers'
import { RPCProviderObject } from '@3loop/transaction-decoder'
import { Effect } from 'effect'

const getProvider = (chainID: number): Effect.Effect<never, UnknownNetwork, RPCProviderObject> => {
    if (chainID === 5) {
        return { provider: Effect.succeed(new JsonRpcProvider(GOERLI_RPC)) }
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
        set: ({ address = {}, func = {}, event = {} }) =>
            Effect.sync(() => {
                // NOTE: Ignore caching as we relay only on local abis
            }),
        get: ({ address, signature, event }) =>
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
                    return abi
                }

                return null
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
                address: request.address,
                chainID: request.chainID,
                contractName: 'Mock Contract',
                contractAddress: request.address,
                tokenSymbol: 'MOCK',
                decimals: 18,
                type: ContractType.ERC20,
            }
        }),
        set: ({ address, chainID }) => Effect.sync(() => {
            // NOTE: Ignore for now
        }),
    })
```

4. Create a context using the services we created above

```ts
const LoadersLayer = Layer.provideMerge(AbiStoreLive, MetaStoreLive)
const RPCProviderLive = Layer.succeed(RPCProvider, RPCProvider.of({ _tag: 'RPCProvider', getProvider: getProvider }))

const MainLayer = Layer.provideMerge(RPCProviderLive, LoadersLayer)
```

5. Fetch and decode a transaction

```ts
const program = Effect.gen(function* (_) {
    const hash = '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75'
    const chainID = 5

    return yield* _(decodeTransactionByHash(hash, chainID))
})
```

6. Finally provide the context and run the program

```ts
const customRuntime = pipe(Layer.toRuntime(MainLayer), Effect.scoped, Effect.runSync)
const result = await program.pipe(Effect.provide(customRuntime), Effect.runPromise)
```

## ABI Strategies

`AbiStore` accepts an array of strategies that are used to resolve the ABI from third-party APIs in case the store is missing the ABI. If an ABI is successfully resolved, it is then cached in the store.

Loop Decoder provides 4 strategies out of the box:

-   `EtherscanStrategyResolver` - resolves the ABI from Etherscan
-   `SourcifyStrategyResolver` - resolves the ABI from Sourcify
-   `FourByteStrategyResolver` - resolves the ABI from 4byte.directory
-   `OpenchainStrategyResolver` - resolves the ABI from Openchain

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

-   [EVM Translator](https://github.com/metagame-xyz/evm-translator) - some data types and data manipulations were heavily inspired by this source.
