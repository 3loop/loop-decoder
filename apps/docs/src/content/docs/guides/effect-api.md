---
title: Effect API
description: Loop Decoder Effect API
---

## Advanced Effect API

Loop decoder also exposes [Effect](https://effect.website/) API interfaces.

To get started with using the Decoder, first, you have to provide the RPC Provider and a ContractLoader Service.

1. Create an RPC Provider

```ts
import { PublicClient, PublicClientObject } from '@3loop/transaction-decoder'
import { Effect } from 'effect'

const getPublicClient = (chainID: number): Effect.Effect<PublicClientObject, UnknownNetwork> => {
    if (chainID === 5) {
        return Effect.succeed({
            client: createPublicClient({
                transport: http(GOERLI_RPC),
            }),
        })
    }
    return Effect.fail(new UnknownNetwork(chainID))
}
```

2. Create the AbiStore

`AbiStore` serves as a repository for obtaining and caching the contract ABI necessary for decoding transaction data. In a real-world scenario, it may be preferable to retrieve this data from a database. In the following example, we will be hardcoding all the necessary information.

To create a new `AbiStore` service you will need to implement two methods `set` and `get`, optionally provide an `getMany` implementation.

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
        strategies: { default: [] },
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
const PublicClientLive = Layer.succeed(
    PublicClient,
    PublicClient.of({ _tag: 'PublicClient', getPublicClient: getPublicClient }),
)

const MainLayer = Layer.provideMerge(PublicClientLive, LoadersLayer)
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
const result = await program.pipe(Effect.provideSomeRuntime(customRuntime), Effect.runPromise)
```
