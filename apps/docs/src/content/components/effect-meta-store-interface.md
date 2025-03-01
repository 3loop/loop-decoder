```ts
export interface ContractMetaStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractMetaResolverStrategy[]>
  readonly set: (arg: ContractMetaParams, value: ContractMetaResult) => Effect.Effect<void, never>
  readonly get: (arg: ContractMetaParams) => Effect.Effect<ContractMetaResult, never>
  readonly getMany?: (arg: Array<ContractMetaParams>) => Effect.Effect<Array<ContractMetaResult>, never>
}
```
