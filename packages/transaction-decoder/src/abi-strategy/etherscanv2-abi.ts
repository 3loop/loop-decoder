import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'

const endpoint = 'https://api.etherscan.io/v2/api'

async function fetchContractABI(
  { address, chainID }: RequestModel.GetContractABIStrategy,
  config?: { apikey?: string },
): Promise<RequestModel.ContractABI[]> {
  const params: Record<string, string> = {
    module: 'contract',
    action: 'getabi',
    chainId: chainID.toString(),
    address,
  }

  if (config?.apikey) {
    params['apikey'] = config.apikey
  }

  const searchParams = new URLSearchParams(params)

  const response = await fetch(`${endpoint}?${searchParams.toString()}`)
  const json = (await response.json()) as { status: string; result: string }

  if (json.status === '1') {
    return [
      {
        type: 'address',
        address,
        chainID,
        abi: json.result,
      },
    ]
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const EtherscanV2StrategyResolver = (config?: { apikey?: string }): RequestModel.ContractAbiResolverStrategy => {
  return {
    type: 'address',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchContractABI(req, config),
          catch: () => new RequestModel.ResolveStrategyABIError('etherscanV2', req.address, req.chainID),
        }),
        'AbiStrategy.EtherscanV2StrategyResolver',
        { attributes: { chainID: req.chainID, address: req.address } },
      ),
    ),
  }
}
