import { Effect, RequestResolver } from 'effect'
import { ContractLoader, ContractType, GetContractABI, GetContractMeta, MissingABIError } from '@/effect.js'
import fs from 'fs'
import { fetchContractABI } from '@/helpers/etherscan-abi.js'

const contractABIResolver = RequestResolver.fromFunctionEffect(({ address, signature, chainID }: GetContractABI) =>
    Effect.gen(function* (_) {
        const addressExists = yield* _(
            Effect.sync(() => fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`)),
        )

        if (addressExists) {
            return yield* _(
                Effect.sync(() => fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString()),
            )
        }

        const signatureExists = yield* _(
            Effect.sync(() => fs.existsSync(`./test/mocks/abi/${signature.toLowerCase()}.json`)),
        )

        if (signatureExists) {
            const signatureAbi = yield* _(
                Effect.sync(() => fs.readFileSync(`./test/mocks/abi/${signature.toLowerCase()}.json`)?.toString()),
            )
            return `[${signatureAbi}]`
        }

        // NOTE: We should reach this only while writing tests, to not hit api in CI
        const etherscan = yield* _(
            Effect.tryPromise({
                try: () => fetchContractABI(address, chainID),
                catch: () => new MissingABIError(address, signature),
            }),
        )

        if (etherscan == null) {
            return yield* _(Effect.fail(new MissingABIError(address, signature)))
        } else {
            yield* _(Effect.sync(() => fs.writeFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`, etherscan)))
            return etherscan
        }
    }),
)

const ERC1155_CONTRACTS = ['0x58c3c2547084cc1c94130d6fd750a3877c7ca5d2', '0x4bed3ae022fd201ab7185a9bc80cb8bf9819bb80']
const ERC721_CONTRACTS = ['0xc3e4214dd442136079df06bb2529bae276d37564']
const contractMetaResolver = RequestResolver.fromFunctionEffect((request: GetContractMeta) => {
    if ('0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6' === request.address.toLowerCase()) {
        return Effect.succeed({
            address: request.address,
            chainID: request.chainID,
            contractName: 'Wrapped Ether',
            contractAddress: request.address,
            tokenSymbol: 'WETH',
            decimals: 18,
            type: ContractType.WETH,
        })
    }

    if (ERC1155_CONTRACTS.includes(request.address.toLowerCase())) {
        return Effect.succeed({
            address: request.address,
            chainID: request.chainID,
            contractName: 'Mock ERC1155 Contract',
            contractAddress: request.address,
            tokenSymbol: 'ERC1155',
            type: ContractType.ERC1155,
        })
    }

    if (ERC721_CONTRACTS.includes(request.address.toLowerCase())) {
        return Effect.succeed({
            address: request.address,
            chainID: request.chainID,
            contractName: 'Mock ERC721 Contract',
            contractAddress: request.address,
            tokenSymbol: 'ERC721',
            type: ContractType.ERC721,
        })
    }

    return Effect.succeed({
        address: request.address,
        chainID: request.chainID,
        contractName: 'Mock ERC20 Contract',
        contractAddress: request.address,
        tokenSymbol: 'ERC20',
        decimals: 18,
        type: ContractType.ERC20,
    })
})

export const MockedContractLoader = ContractLoader.of({
    _tag: 'ContractLoader',
    contractABIResolver,
    contractMetaResolver,
})
