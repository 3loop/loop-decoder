import { RPCFetchError, UnknownNetwork } from '../public-client.js'
import { ContractData } from '../types.js'
import { PrimaryKey, RequestResolver, Schema, SchemaAST } from 'effect'
import { Address } from 'viem'

export interface FetchMetaParams {
  readonly chainId: number
  readonly address: Address
  readonly strategyId: string
}

export class ResolveStrategyMetaError {
  readonly _tag = 'ResolveStrategyMetaError'
  constructor(
    readonly resolverName: string,
    readonly address: Address,
    readonly chain: number,
  ) {}
}

export interface ContractMetaResolverStrategy {
  id: string
  resolver: RequestResolver.RequestResolver<GetContractMetaStrategy, never>
}

class SchemaAddress extends Schema.make<Address>(SchemaAST.stringKeyword) {}
class SchemaContractData extends Schema.make<ContractData>(SchemaAST.objectKeyword) {}
export class GetContractMetaStrategy extends Schema.TaggedRequest<GetContractMetaStrategy>()(
  'GetContractMetaStrategy',
  {
    failure: Schema.Union(
      Schema.instanceOf(ResolveStrategyMetaError),
      Schema.instanceOf(UnknownNetwork),
      Schema.instanceOf(RPCFetchError),
    ),
    success: SchemaContractData,
    payload: {
      chainId: Schema.Number,
      address: SchemaAddress,
      strategyId: Schema.String,
    },
  },
) {
  [PrimaryKey.symbol]() {
    return `contract-meta-strategy::${this.chainId}:${this.address}${this.strategyId}`
  }
}
