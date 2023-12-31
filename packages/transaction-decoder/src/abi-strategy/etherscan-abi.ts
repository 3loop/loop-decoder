import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'

const endpoints: { [k: number]: string } = {
    1: 'https://api.etherscan.io/api',
    3: 'https://api-ropsten.etherscan.io/api',
    4: 'https://api-rinkeby.etherscan.io/api',
    5: 'https://api-goerli.etherscan.io/api',
    11155111: 'https://api-sepolia.etherscan.io/api',
}

async function fetchContractABI(
    { address, chainID }: RequestModel.GetContractABIStrategy,
    config?: { apikey?: string; endpoint?: string },
) {
    const endpoint = config?.endpoint ?? endpoints[chainID]

    const params: Record<string, string> = {
        module: 'contract',
        action: 'getabi',
        address,
    }

    if (config?.apikey) {
        params['apikey'] = config.apikey
    }

    const searchParams = new URLSearchParams(params)

    const response = await fetch(`${endpoint}?${searchParams.toString()}`)
    const json = (await response.json()) as { status: string; result: string }

    if (json.status === '1') {
        return {
            address: {
                [address]: json.result,
            },
        }
    }

    throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const EtherscanStrategyResolver = (config?: { apikey?: string; endpoint?: string }) =>
    RequestResolver.fromFunctionEffect((req: RequestModel.GetContractABIStrategy) =>
        Effect.tryPromise({
            try: () => fetchContractABI(req, config),
            catch: () => new RequestModel.ResolveStrategyABIError('etherscan', req.address, req.chainID),
        }),
    )
