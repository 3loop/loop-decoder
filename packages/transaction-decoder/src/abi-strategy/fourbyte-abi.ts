import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'
import { parseAbiItem } from 'viem'

type FourBytesResponse = {
    count: number
    results: {
        text_signature: string
    }[]
}

const endpoint = 'https://www.4byte.directory/api/v1'

function parseFunctionSignature(signature: string): string {
    return JSON.stringify(parseAbiItem('function ' + signature))
}

function parseEventSignature(signature: string): string {
    return JSON.stringify(parseAbiItem('event ' + signature))
}

// TODO: instead of getting the first match, we should detect the best match
async function fetchABI({
    address,
    event,
    signature,
    chainID,
}: RequestModel.GetContractABIStrategy): Promise<RequestModel.ContractABI> {
    if (signature != null) {
        const full_match = await fetch(`${endpoint}/signatures/?hex_signature=${signature}`)
        if (full_match.status === 200) {
            const json = (await full_match.json()) as FourBytesResponse

            return {
                func: {
                    [signature]: parseFunctionSignature(json.results[0]?.text_signature),
                },
            }
        }
    }

    if (event != null) {
        const partial_match = await fetch(`${endpoint}/event-signatures/?hex_signature=${signature}`)
        if (partial_match.status === 200) {
            const json = (await partial_match.json()) as FourBytesResponse
            return {
                event: {
                    [event]: parseEventSignature(json.results[0]?.text_signature),
                },
            }
        }
    }

    throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const FourByteStrategyResolver = () =>
    RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
        Effect.tryPromise({
            try: () => fetchABI(req),
            catch: () => new RequestModel.ResolveStrategyABIError('4byte.directory', req.address, req.chainID),
        }),
    )
