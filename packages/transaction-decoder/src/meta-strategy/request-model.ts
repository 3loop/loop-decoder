import { UnknownNetwork } from '../public-client.js'
import { ContractData } from '../types.js'
import { PrimaryKey, Schema, SchemaAST } from 'effect'
import { Address } from 'viem'

export interface FetchMetaParams {
  readonly chainID: number
  readonly address: Address
}

export class ResolveStrategyMetaError {
  readonly _tag = 'ResolveStrategyMetaError'
  constructor(
    readonly resolverName: string,
    readonly address: Address,
    readonly chain: number,
  ) {}
}

class SchemaAddress extends Schema.make<Address>(SchemaAST.stringKeyword) {}
class SchemaContractData extends Schema.make<ContractData>(SchemaAST.objectKeyword) {}
export class GetContractMetaStrategy extends Schema.TaggedRequest<GetContractMetaStrategy>()(
  'GetContractMetaStrategy',
  {
    failure: Schema.Union(Schema.instanceOf(ResolveStrategyMetaError), Schema.instanceOf(UnknownNetwork)),
    success: SchemaContractData,
    payload: {
      chainID: Schema.Number,
      address: SchemaAddress,
    },
  },
) {
  [PrimaryKey.symbol]() {
    return `contract-meta-strategy::${this.chainID}:${this.address}`
  }
}
