import { Effect, Context, RequestResolver } from 'effect'
import { ContractLoader, ContractType, GetContractABI, GetContractMeta, decodeTransactionByHash } from '../src/index.js'
import { RPCProvider, UnknownNetwork } from '../src/provider.js'
import { JsonRpcProvider } from 'ethers'

const GOERLI_RPC = 'https://rpc.ankr.com/eth_goerli'

const program = Effect.gen(function* (_) {
    const hash = '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75'
    const chainID = 5

    return yield* _(decodeTransactionByHash(hash, chainID))
})

const getProvider = (chainID: number): Effect.Effect<never, UnknownNetwork, JsonRpcProvider> => {
    if (chainID === 5) {
        return Effect.succeed(new JsonRpcProvider(GOERLI_RPC))
    }
    return Effect.fail(new UnknownNetwork(chainID))
}

const contractABIResolver = RequestResolver.fromFunctionEffect((_request: GetContractABI) => Effect.succeed(''))

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

const runnable = Effect.provideContext(program, context)

Effect.runPromise(runnable).then(console.log).catch(console.error)
