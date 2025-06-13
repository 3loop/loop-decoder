import { Effect } from 'effect'
import * as RequestModel from './request-model.js'

const endpoint = 'https://api.etherscan.io/v2/api'

type FetchResult =
  | { type: 'success'; data: RequestModel.ContractABI[] }
  | { type: 'missing'; reason: string }
  | { type: 'error'; cause: unknown }

async function fetchContractABI(
  { address, chainId }: RequestModel.GetContractABIStrategyParams,
  config?: { apikey?: string },
): Promise<FetchResult> {
  try {
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
      return {
        type: 'success',
        data: [
          {
            type: 'address',
            address,
            chainID: chainId,
            abi: json.result,
          },
        ],
      }
    }

    // If the API request was successful but no ABI was found
    if (
      json.status === '0' &&
      (json.result === 'Contract source code not verified' || json.result.includes('not verified'))
    ) {
      return {
        type: 'missing',
        reason: `No verified ABI found: ${json.result}`,
      }
    }

    return {
      type: 'error',
      cause: json,
    }
  } catch (error) {
    return {
      type: 'error',
      cause: error,
    }
  }
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
        Effect.gen(function* () {
          const result = yield* Effect.promise(() => fetchContractABI(req, config))

          if (result.type === 'success') {
            return result.data
          } else if (result.type === 'missing') {
            return yield* Effect.fail(
              new RequestModel.MissingABIStrategyError(
                req.address,
                req.chainId,
                'etherscanV2-strategy',
                undefined,
                undefined,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(
              new RequestModel.ResolveStrategyABIError('etherscanV2', req.address, req.chainId, String(result.cause)),
            )
          }
        }),
        'AbiStrategy.EtherscanV2StrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
