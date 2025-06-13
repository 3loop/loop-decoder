import { Effect } from 'effect'
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

type FetchResult =
  | { type: 'success'; data: RequestModel.ContractABI[] }
  | { type: 'missing'; reason: string }
  | { type: 'error'; cause: unknown }

// TODO: instead of getting the first match, we should detect the best match
async function fetchABI({
  address,
  event,
  signature,
  chainId,
}: RequestModel.GetContractABIStrategyParams): Promise<FetchResult> {
  try {
    if (signature != null) {
      const full_match = await fetch(`${endpoint}/signatures/?hex_signature=${signature}`)
      if (full_match.status === 200) {
        const json = (await full_match.json()) as FourBytesResponse

        if (json.count > 0) {
          return {
            type: 'success',
            data: json.results.map((result) => ({
              type: 'func',
              address,
              chainID: chainId,
              abi: parseFunctionSignature(result.text_signature),
              signature,
            })),
          }
        } else {
          // Successful request but no signatures found
          return {
            type: 'missing',
            reason: `No function signature found for ${signature}`,
          }
        }
      }
    }

    if (event != null) {
      const partial_match = await fetch(`${endpoint}/event-signatures/?hex_signature=${event}`)
      if (partial_match.status === 200) {
        const json = (await partial_match.json()) as FourBytesResponse
        if (json.count > 0) {
          return {
            type: 'success',
            data: json.results.map((result) => ({
              type: 'event',
              address,
              chainID: chainId,
              abi: parseEventSignature(result.text_signature),
              event,
            })),
          }
        } else {
          // Successful request but no events found
          return {
            type: 'missing',
            reason: `No event signature found for ${event}`,
          }
        }
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

export const FourByteStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'fourbyte-strategy',
    type: 'fragment',
    resolver: (req: RequestModel.GetContractABIStrategyParams) =>
      Effect.withSpan(
        Effect.gen(function* () {
          const result = yield* Effect.promise(() => fetchABI(req))

          if (result.type === 'success') {
            return result.data
          } else if (result.type === 'missing') {
            return yield* Effect.fail(
              new RequestModel.MissingABIStrategyError(
                req.address,
                req.chainId,
                'fourbyte-strategy',
                req.event,
                req.signature,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(
              new RequestModel.ResolveStrategyABIError(
                '4byte.directory',
                req.address,
                req.chainId,
                String(result.cause),
              ),
            )
          }
        }),
        'AbiStrategy.FourByteStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
