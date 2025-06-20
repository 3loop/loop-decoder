import { Effect } from 'effect'
import * as RequestModel from './request-model.js'

type FetchResult =
  | { type: 'success'; data: RequestModel.ContractABI[] }
  | { type: 'missing'; reason: string }
  | { type: 'error'; cause: unknown }

const endpoints: { [k: number]: string } = {
  // all mainnet
  1: 'https://api.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  137: 'https://api.polygonscan.com/api',
  250: 'https://api.ftmscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  43114: 'https://api.snowtrace.io/api',
  1285: 'https://api-moonriver.moonscan.io/api',
  1284: 'https://api-moonbeam.moonscan.io/api',
  25: 'https://api.cronoscan.com/api',
  199: 'https://api.bttcscan.com/api',
  10: 'https://api-optimistic.etherscan.io/api',
  42220: 'https://api.celoscan.io/api',
  288: 'https://api.bobascan.com/api',
  100: 'https://api.gnosisscan.io/api',
  1101: 'https://api-zkevm.polygonscan.com/api',
  59144: 'https://api.lineascan.build/api',
  8453: 'https://api.basescan.org/api',
  534352: 'https://api.scrollscan.com/api',

  // all testnet
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  17000: 'https://api-holesky.etherscan.io/api',
  11155111: 'https://api-sepolia.etherscan.io/api',
  97: 'https://api-testnet.bscscan.com/api',
  80001: 'https://api-testnet.polygonscan.com/api',
  4002: 'https://api-testnet.ftmscan.com/api',
  421611: 'https://api-testnet.arbiscan.io/api',
  42170: 'https://api-nova.arbiscan.io/api',
  43113: 'https://api-testnet.snowtrace.io/api',
  1287: 'https://api-moonbase.moonscan.io/api',
  338: 'https://api-testnet.cronoscan.com/api',
  1028: 'https://api-testnet.bttcscan.com/api',
  420: 'https://api-goerli-optimistic.etherscan.io/api',
  44787: 'https://api-alfajores.celoscan.io/api',
  2888: 'https://api-testnet.bobascan.com/api',
  84531: 'https://api-goerli.basescan.org/api',
  84532: 'https://api-sepolia.basescan.org/api',
  1442: 'https://api-testnet-zkevm.polygonscan.com/api',
  59140: 'https://api-testnet.lineascan.build/api',
  534351: 'https://api-sepolia.scrollscan.com/api',
}

async function fetchContractABI(
  { address, chainId }: RequestModel.GetContractABIStrategyParams,
  config?: { apikey?: string; endpoint?: string },
): Promise<FetchResult> {
  try {
    const endpoint = config?.endpoint ?? endpoints[chainId]
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

export const EtherscanStrategyResolver = (config?: {
  apikey?: string
  endpoint?: string
}): RequestModel.ContractAbiResolverStrategy => {
  return {
    id: 'etherscan-strategy',
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
                'etherscan-strategy',
                undefined,
                undefined,
                result.reason,
              ),
            )
          } else {
            return yield* Effect.fail(
              new RequestModel.ResolveStrategyABIError('etherscan', req.address, req.chainId, String(result.cause)),
            )
          }
        }),
        'AbiStrategy.EtherscanStrategyResolver',
        { attributes: { chainId: req.chainId, address: req.address } },
      ),
  }
}
