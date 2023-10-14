import { getAddress } from 'ethers'
import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'

interface SourcifyResponse {
    output: {
        abi: object
    }
}

const endpoint = 'https://repo.sourcify.dev/contracts/'

async function fetchContractABI({ address, chainID }: RequestModel.GetContractABIStrategy) {
    const normalisedAddress = getAddress(address)

    const full_match = await fetch(`${endpoint}/full_match/${chainID}/${normalisedAddress}/metadata.json`)

    if (full_match.status === 200) {
        const json = (await full_match.json()) as SourcifyResponse

        return {
            address: {
                [address]: JSON.stringify(json.output.abi),
            },
        }
    }

    const partial_match = await fetch(`${endpoint}/partial_match/${chainID}/${normalisedAddress}/metadata.json`)
    if (partial_match.status === 200) {
        const json = (await partial_match.json()) as SourcifyResponse
        return {
            address: {
                [address]: JSON.stringify(json.output.abi),
            },
        }
    }

    throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const SourcifyStrategyResolver = () =>
    RequestResolver.fromFunctionEffect((req: RequestModel.GetContractABIStrategy) =>
        Effect.tryPromise({
            try: () => fetchContractABI(req),
            catch: () => new RequestModel.ResolveStrategyABIError('sourcify', req.address, req.chainID),
        }),
    )
