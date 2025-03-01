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

// TODO: instead of getting the first match, we should detect the best match
async function fetchABI({
  address,
  event,
  signature,
  chainId,
}: RequestModel.GetContractABIStrategyParams): Promise<RequestModel.ContractABI[]> {
  if (signature != null) {
    const full_match = await fetch(`${endpoint}/signatures/?hex_signature=${signature}`)
    if (full_match.status === 200) {
      const json = (await full_match.json()) as FourBytesResponse

      return json.results.map((result) => ({
        type: 'func',
        address,
        chainID: chainId,
        abi: parseFunctionSignature(result.text_signature),
        signature,
      }))
    }
  }

  if (event != null) {
    const partial_match = await fetch(`${endpoint}/event-signatures/?hex_signature=${event}`)
    if (partial_match.status === 200) {
      const json = (await partial_match.json()) as FourBytesResponse
      return json.results.map((result) => ({
        type: 'event',
        address,
        chainID: chainId,
        abi: parseEventSignature(result.text_signature),
        event,
      }))
    }
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainId}`)
}

export const FourByteStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'fourbyte-strategy',
    type: 'fragment',
    resolver: (req: RequestModel.GetContractABIStrategyParams) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchABI(req),
          catch: () => new RequestModel.ResolveStrategyABIError('4byte.directory', req.address, req.chainId),
        }),
        'AbiStrategy.FourByteStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
