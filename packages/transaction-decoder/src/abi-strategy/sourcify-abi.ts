import { getAddress } from 'viem'
import { Effect, RequestResolver } from 'effect'
import * as RequestModel from './request-model.js'

interface SourcifyResponse {
  output: {
    abi: object
  }
}

const endpoint = 'https://repo.sourcify.dev/contracts/'

async function fetchContractABI({
  address,
  chainID,
}: RequestModel.GetContractABIStrategy): Promise<RequestModel.ContractABI> {
  const normalisedAddress = getAddress(address)

  const full_match = await fetch(`${endpoint}/full_match/${chainID}/${normalisedAddress}/metadata.json`)

  if (full_match.status === 200) {
    const json = (await full_match.json()) as SourcifyResponse

    return {
      type: 'address',
      address,
      chainID,
      abi: JSON.stringify(json.output.abi),
    }
  }

  const partial_match = await fetch(`${endpoint}/partial_match/${chainID}/${normalisedAddress}/metadata.json`)
  if (partial_match.status === 200) {
    const json = (await partial_match.json()) as SourcifyResponse
    return {
      type: 'address',
      address,
      chainID,
      abi: JSON.stringify(json.output.abi),
    }
  }

  throw new Error(`Failed to fetch ABI for ${address} on chain ${chainID}`)
}

export const SourcifyStrategyResolver = (): RequestModel.ContractAbiResolverStrategy => {
  return {
    type: 'address',
    resolver: RequestResolver.fromEffect((req: RequestModel.GetContractABIStrategy) =>
      Effect.withSpan(
        Effect.tryPromise({
          try: () => fetchContractABI(req),
          catch: () => new RequestModel.ResolveStrategyABIError('sourcify', req.address, req.chainID),
        }),
        'AbiStrategy.SourcifyStrategyResolver',
        { attributes: { chainID: req.chainID, address: req.address } },
      ),
    ),
  }
}
