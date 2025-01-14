```ts
export interface ContractMetaStore<Key = ContractMetaParams, Value = ContractMetaResult> {
  readonly strategies: Record<ChainOrDefault, readonly ContractMetaResolverStrategy[]>
  readonly set: (arg: Key, value: Value) => Effect.Effect<void, never>
  readonly get: (arg: Key) => Effect.Effect<Value, never>
  readonly getMany?: (arg: Array<Key>) => Effect.Effect<Array<Value>, never>
}
```
