import { getAddress } from 'viem'
import { Effect } from 'effect'
import * as RequestModel from './request-model.js'

interface SourcifyResponse {
  output: {
    abi: object
  }
}

const endpoint = 'https://repo.sourcify.dev/contracts/'

type FetchResult =
  | { type: 'success'; data: RequestModel.ContractABI[] }
  | { type: 'missing'; reason: string }
  | { type: 'error'; cause: unknown }

async function fetchContractABI({ address, chainId }: RequestModel.GetContractABIStrategyParams): Promise<FetchResult> {
  try {
    const normalisedAddress = getAddress(address)

    const full_match = await fetch(`${endpoint}/full_match/${chainId}/${normalisedAddress}/metadata.json`)

    if (full_match.status === 200) {
      const json = (await full_match.json()) as SourcifyResponse

      return {
        type: 'success',
        data: [
          {
            type: 'address',
            address,
            chainID: chainId,
            abi: JSON.stringify(json.output.abi),
          },
        ],
      }
    }

    const partial_match = await fetch(`${endpoint}/partial_match/${chainId}/${normalisedAddress}/metadata.json`)
    if (partial_match.status === 200) {
      const json = (await partial_match.json()) as SourcifyResponse
      return {
        type: 'success',
        data: [
          {
            type: 'address',
            address,
            chainID: chainId,
            abi: JSON.stringify(json.output.abi),
          },
        ],
      }
    }

    // Check if it's a 404 (not found) which means the contract is not verified on Sourcify
    if (full_match.status === 404 && partial_match.status === 404) {
      return {
        type: 'missing',
        reason: 'Contract not found on Sourcify',
      }
    }

    return {
      type: 'error',
      cause: `Failed to fetch ABI for ${address} on chain ${chainId}`,
    }
  } catch (error) {
    return {
      type: 'error',
      cause: error,
    }
  }
}

export const SourcifyStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'sourcify-strategy',
    type: 'address',
    resolver: (req: RequestModel.GetContractABIStrategyParams) =>
      Effect.withSpan(
        Effect.gen(function* () {
          const result = yield* Effect.promise(() => fetchContractABI(req))

          if (result.type === 'success') {
            return result.data
          } else if (result.type === 'missing') {
            return yield* Effect.fail(
              new RequestModel.MissingABIStrategyError(
                req.address,
                req.chainId,
                'sourcify-strategy',
                undefined,
                undefined,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(new RequestModel.ResolveStrategyABIError('sourcify', req.address, req.chainId))
          }
        }),
        'AbiStrategy.SourcifyStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
