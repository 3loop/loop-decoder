import { PrimaryKey, RequestResolver, Schema, SchemaAST } from 'effect'

export interface FetchABIParams {
  readonly chainID: number
  readonly address: string
  readonly event?: string | undefined
  readonly signature?: string | undefined
}

export class ResolveStrategyABIError {
  readonly _tag = 'ResolveStrategyABIError'
  constructor(
    readonly resolverName: string,
    readonly address: string,
    readonly chain: number,
  ) {}
}

interface FunctionFragmentABI {
  type: 'func'
  abi: string
  address: string
  chainID: number
  signature: string
}

interface EventFragmentABI {
  type: 'event'
  abi: string
  address: string
  chainID: number
  event: string
}

interface AddressABI {
  type: 'address'
  abi: string
  address: string
  chainID: number
}

export type ContractABI = FunctionFragmentABI | EventFragmentABI | AddressABI

export interface ContractAbiResolverStrategy {
  type: 'address' | 'fragment'
  id: string
  resolver: RequestResolver.RequestResolver<GetContractABIStrategy, never>
}

class SchemaContractAbi extends Schema.make<ContractABI>(SchemaAST.objectKeyword) {}
export class GetContractABIStrategy extends Schema.TaggedRequest<GetContractABIStrategy>()('GetContractABIStrategy', {
  failure: Schema.instanceOf(ResolveStrategyABIError),
  success: Schema.Array(SchemaContractAbi),
  payload: {
    chainId: Schema.Number,
    address: Schema.String,
    strategyId: Schema.String,
    event: Schema.optional(Schema.String),
    signature: Schema.optional(Schema.String),
  },
}) {
  [PrimaryKey.symbol]() {
    return `abi-strategy::${this.chainId}:${this.address}:${this.event}:${this.signature}:${this.strategyId}`
  }
}
