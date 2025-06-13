import { Effect } from 'effect'
import * as RequestModel from './request-model.js'
import { parseAbiItem } from 'viem'

type OpenchainResponse = {
  ok: boolean
  result: {
    event: Record<
      string,
      {
        name: string
        filtered: boolean
      }[]
    >
    function: Record<
      string,
      {
        name: string
        filtered: boolean
      }[]
    >
  }
}

const endpoint = 'https://api.openchain.xyz/signature-database/v1/lookup'
const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
}

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

async function fetchABI({
  address,
  chainId,
  signature,
  event,
}: RequestModel.GetContractABIStrategyParams): Promise<FetchResult> {
  try {
    if (signature != null) {
      const response = await fetch(`${endpoint}?function=${signature}`, options)
      if (response.status === 200) {
        const json = (await response.json()) as OpenchainResponse

        if (json.ok && json.result.function[signature] && json.result.function[signature].length > 0) {
          return {
            type: 'success',
            data: json.result.function[signature].map((f) => ({
              type: 'func',
              address,
              chainID: chainId,
              abi: parseFunctionSignature(f.name),
              signature,
            })),
          }
        } else {
          // Successful request but no function signatures found
          return {
            type: 'missing',
            reason: `No function signature found for ${signature}`,
          }
        }
      }
    }
    if (event != null) {
      const response = await fetch(`${endpoint}?event=${event}`, options)
      if (response.status === 200) {
        const json = (await response.json()) as OpenchainResponse

        if (json.ok && json.result.event[event] && json.result.event[event].length > 0) {
          return {
            type: 'success',
            data: json.result.event[event].map((e) => ({
              type: 'event',
              address,
              chainID: chainId,
              abi: parseEventSignature(e.name),
              event,
            })),
          }
        } else {
          // Successful request but no event signatures found
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

export const OpenchainStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'openchain-strategy',
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
                'openchain-strategy',
                req.event,
                req.signature,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(
              new RequestModel.ResolveStrategyABIError('openchain', req.address, req.chainId, String(result.cause)),
            )
          }
        }),
        'AbiStrategy.OpenchainStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
