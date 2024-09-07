import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'

async function fetchContractABI(
  { address, chainID }: RequestModel.GetContractABIStrategy,
  config: { apikey?: string; endpoint: string },
): Promise<RequestModel.ContractABI[]> {
  const endpoint = config.endpoint

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
  const json = (await response.json()) as { status: string; result: string; message: string }

  if (json.status === '1') {
    return [
      {
        chainID,
        address,
        abi: json.result,
        type: 'address',
      },
    ]
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const BlockscoutStrategyResolver = (config: {
  apikey?: string
  endpoint: string
}): RequestModel.ContractAbiResolverStrategy => {
  return {
    type: 'address',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchContractABI(req, config),
          catch: () => new RequestModel.ResolveStrategyABIError('Blockscout', req.address, req.chainID),
        }),
        'AbiStrategy.BlockscoutStrategyResolver',
        { attributes: { chainID: req.chainID, address: req.address } },
      ),
    ),
  }
}
