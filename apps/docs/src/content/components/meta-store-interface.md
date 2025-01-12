```ts title="vanilla.ts"
export interface VanillaContractMetaStore {
  strategies?: readonly VanillaContractMetaStategy[]
  get: (key: ContractMetaParams) => Promise<ContractMetaResult>
  set: (key: ContractMetaParams, val: ContractMetaResult) => Promise<void>
}
```
