import { Effect, RequestResolver } from 'effect'
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

async function fetchABI({
  address,
  chainID,
  signature,
  event,
}: RequestModel.GetContractABIStrategy): Promise<RequestModel.ContractABI[]> {
  if (signature != null) {
    const response = await fetch(`${endpoint}?function=${signature}`, options)
    if (response.status === 200) {
      const json = (await response.json()) as OpenchainResponse

      return json.result.function[signature].map((f) => ({
        type: 'func',
        address,
        chainID,
        abi: parseFunctionSignature(f.name),
        signature,
      }))
    }
  }
  if (event != null) {
    const response = await fetch(`${endpoint}?event=${event}`, options)
    if (response.status === 200) {
      const json = (await response.json()) as OpenchainResponse

      return json.result.event[event].map((e) => ({
        type: 'event',
        address,
        chainID,
        abi: parseEventSignature(e.name),
        event,
      }))
    }
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const OpenchainStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    type: 'fragment',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchABI(req),
          catch: () => new RequestModel.ResolveStrategyABIError('openchain', req.address, req.chainID),
        }),
        'AbiStrategy.OpenchainStrategyResolver',
        { attributes: { chainID: req.chainID, address: req.address } },
      ),
    ),
  }
}
