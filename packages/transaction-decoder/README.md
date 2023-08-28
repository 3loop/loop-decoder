# Loop Decoder

## Getting Started

Public API exposeses [Effect](https://effect.website/) interfaces.

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

- `contractABIResolver` - fetch ABI or ABI Fragmend from address, signature, and chain ID.

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

- `contractMetaResolver` - fetch the contract meta information from the address and chain ID.

```ts
const contractMetaResolver = RequestResolver.fromFunctionEffect((request: GetContractMeta) =>
    Effect.succeed({
        address: request.address,
        chainID: request.chainID,
        contractName: 'Mock Contract',
        contractAddress: request.address,
        tokenSymbol: 'MOCK',
        decimals: 18,
        contractOfficialName: 'Mock Contract',
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

- [EVM Translator](https://github.com/metagame-xyz/evm-translator) - some data types and data manipulations were heavily inspired by this source.
