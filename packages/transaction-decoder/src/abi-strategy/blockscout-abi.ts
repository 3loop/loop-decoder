import { Effect } from 'effect'
import * as RequestModel from './request-model.js'

type FetchResult =
  | { type: 'success'; data: RequestModel.ContractABI[] }
  | { type: 'missing'; reason: string }
  | { type: 'error'; cause: unknown }

async function fetchContractABI(
  { address, chainId }: RequestModel.GetContractABIStrategyParams,
  config: { apikey?: string; endpoint: string },
): Promise<FetchResult> {
  try {
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
      return {
        type: 'success',
        data: [
          {
            chainID: chainId,
            address,
            abi: json.result,
            type: 'address',
          },
        ],
      }
    }

    // If the API request was successful but no ABI was found
    if (
      json.status === '0' &&
      (json.message?.includes('not verified') || json.result === 'Contract source code not verified')
    ) {
      return {
        type: 'missing',
        reason: `No verified ABI found: ${json.message || json.result}`,
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

export const BlockscoutStrategyResolver = (config: {
  apikey?: string
  endpoint: string
}): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'blockscout-strategy',
    type: 'address',
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
                'blockscout-strategy',
                undefined,
                undefined,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(new RequestModel.ResolveStrategyABIError('Blockscout', req.address, req.chainId))
          }
        }),
        'AbiStrategy.BlockscoutStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
