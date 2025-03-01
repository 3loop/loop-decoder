```ts
export interface AbiStore {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: AbiParams, value: ContractAbiResult) => Effect.Effect<void, never>
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>
}
```
