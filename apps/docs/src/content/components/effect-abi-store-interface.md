```ts
export interface AbiStore {
  /**
   * Set of resolver strategies grouped by chain id and a `default` bucket.
   */
  readonly strategies: Record<ChainOrDefault, readonly ContractAbiResolverStrategy[]>
  /**
   * Persist a resolved ABI or a terminal state for a lookup key.
   */
  readonly set: (key: AbiParams, value: CacheContractABIParam) => Effect.Effect<void, never>
  /**
   * Fetch all cached ABIs for the lookup key. Implementations may return multiple entries.
   */
  readonly get: (arg: AbiParams) => Effect.Effect<ContractAbiResult, never>
  /** Optional batched variant of `get` for performance. */
  readonly getMany?: (arg: Array<AbiParams>) => Effect.Effect<Array<ContractAbiResult>, never>
  /** Optional helper for marking an existing cached ABI as invalid or changing its status. */
  readonly updateStatus?: (
    id: string | number,
    status: 'success' | 'invalid' | 'not-found',
  ) => Effect.Effect<void, never>
}
```
