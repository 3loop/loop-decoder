```ts
export interface AbiStore<Key = AbiParams, Value = ContractAbiResult> {
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  readonly set: (key: Key, value: Value) => Effect.Effect<void, never>
  readonly get: (arg: Key) => Effect.Effect<Value, never>
  readonly getMany?: (arg: Array<Key>) => Effect.Effect<Array<Value>, never>
}
```
