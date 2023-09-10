# Loop Decoder

## Requirements

-   TypeScript 5.x
-   `exactOptionalPropertyTypes` and `strict` enabled in your tsconfig.json

## Getting Started

To get started, install the package from npm, along with its peer dependencies:

```
$ npm i @3loop/transaction-decoder
```

To begin using the Loop Decoder, you need to create an instance of the LoopDecoder class. At a minimum, you must provide three callback functions:

-   `getProvider`: This function returns an ethers JsonRpcProvider based on the chain ID.
-   `getContractMeta`: This function returns contract meta-information. See the `ContractData` type for the required properties.
-   `getContractAbi`: This function returns the contract or fragment ABI based on the chain ID, address, and/or signature.

```ts
import { TransactionDecoder } from '@3loop/transaction-decoder'

const db = {} // Your data source

const decoded = new TransactionDecoder({
    getProvider: (chainId: number) => {
        return new JsonRpcProvider(RPC_URL[chainId])
    },
    getContractAbi: async ({ address, chainId, signature }): Promise<string> => {
        return db.getContractAbi({
            address: address,
            chainId: chainId,
        })
    },
    getContractMeta: async (request) => {
        return db.getContractMeta({
            address: address,
            chainId: chainId,
        })
    },
})
```

It's important to note that the Loop Decoder does not enforce any specific data source, allowing users of the library to load contract data as they see fit. Depending on your application's needs, you can either include the required data directly in your code for a small number of contracts or use a database as a cache and automate data retrieval from different sources, such as etherscan or 4bytes.directory, for ABIs.

In the near future, we plan to provide common data adapters and utilities for loading ABIs and contract meta-information for popular dApps.

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
import { JsonRpcProvider } from 'ethers'
import { Effect } from 'effect'

const getProvider = (chainID: number): Effect.Effect<never, UnknownNetwork, JsonRpcProvider> => {
    if (chainID === 5) {
        return Effect.succeed(new JsonRpcProvider(GOERLI_RPC))
    }
    return Effect.fail(new UnknownNetwork(chainID))
}
```

2. Create the ContractLoader

ContractLoader provides all the necessary data to decode the transaction data. In real world you might want to have a database that you can fetch the data from. In the following example we will have everything hardcoded.

To create a new ContractLoader service you will need to implement two RequestResolvers.

-   `contractABIResolver` - fetch ABI or ABI Fragmend from address, signature, and chain ID.

```ts
import { Effect, Context, RequestResolver } from 'effect'

const contractABIResolver = RequestResolver.fromFunctionEffect(({ signature, chainID }: GetContractABI) => {
    const signatureAbiMap = {
        '0x3593564c': 'execute(bytes,bytes[],uint256)',
        '0x0902f1ac': 'getReserves()',
        '0x36c78516': 'transferFrom(address,address,uint160,address)	',
        '0x70a08231': 'balanceOf(address)',
        '0x022c0d9f': 'swap(uint256,uint256,address,bytes)',
        '0x2e1a7d4d': 'withdraw(uint256)',
    }

    const abi = signatureAbiMap[signature]

    if (abi && chainID === 5) {
        return Effect.succeed(abi)
    }

    return Effect.succeed(null)
})
```

-   `contractMetaResolver` - fetch the contract meta information from the address and chain ID.

```ts
const contractMetaResolver = RequestResolver.fromFunctionEffect((request: GetContractMeta) =>
    Effect.succeed({
        address: request.address,
        chainID: request.chainID,
        contractName: 'Mock Contract',
        contractAddress: request.address,
        tokenSymbol: 'MOCK',
        decimals: 18,
        type: ContractType.ERC20,
    }),
)
```

3. Create a context using the services we created above

```ts
const context = Context.empty().pipe(
    Context.add(RPCProvider, RPCProvider.of({ _tag: 'RPCProvider', getProvider: getProvider })),
    Context.add(
        ContractLoader,
        ContractLoader.of({
            _tag: 'ContractLoader',
            contractABIResolver: contractABIResolver,
            contractMetaResolver: contractMetaResolver,
        }),
    ),
)
```

4. Fetch and decode a transaction

```ts
const program = Effect.gen(function* (_) {
    const hash = '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75'
    const chainID = 5

    return yield* _(decodeTransactionByHash(hash, chainID))
})
```

5. Finally provide the context and run the program

```ts
const runnable = Effect.provideContext(program, context)

Effect.runPromise(runnable).then(console.log).catch(console.error)
```

### Credits

Some ideas for the decoder and interpreter were inspired by open-source software. Special thanks to:

-   [EVM Translator](https://github.com/metagame-xyz/evm-translator) - some data types and data manipulations were heavily inspired by this source.
