```ts title="vanilla.ts"
export interface VanillaAbiStore {
  strategies?: readonly ContractAbiResolverStrategy[]
  get: (key: AbiParams) => Promise<ContractAbiResult>
  set: (key: AbiParams, val: ContractAbiResult) => Promise<void>
}
```
