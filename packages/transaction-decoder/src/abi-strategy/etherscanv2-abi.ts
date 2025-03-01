import { Effect } from 'effect'
import * as RequestModel from './request-model.js'

const endpoint = 'https://api.etherscan.io/v2/api'

async function fetchContractABI(
  { address, chainId }: RequestModel.GetContractABIStrategyParams,
  config?: { apikey?: string },
): Promise<RequestModel.ContractABI[]> {
  const params: Record<string, string> = {
    module: 'contract',
    action: 'getabi',
    chainId: chainId.toString(),
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
        chainID: chainId,
        abi: json.result,
      },
    ]
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainId}`, {
    cause: json,
  })
}

export const EtherscanV2StrategyResolver = (config?: {
  apikey?: string
  rateLimit?: RequestModel.RateLimiterOptions
}): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'etherscanV2-strategy',
    type: 'address',
    // NOTE: time is longer than one second, because the etherscan will limit by the time request arrives at their server
    // and our rate limiter will limit by the time it was sent
    rateLimit: config?.rateLimit ?? {
      limit: 5,
      interval: '2 seconds',
      algorithm: 'fixed-window',
    },
    resolver: (req: RequestModel.GetContractABIStrategyParams) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchContractABI(req, config),
          catch: () => new RequestModel.ResolveStrategyABIError('etherscanV2', req.address, req.chainId),
        }),
        'AbiStrategy.EtherscanV2StrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
