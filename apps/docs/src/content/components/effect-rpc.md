```ts title="provider.ts"
import { PublicClient, PublicClientObject, UnknownNetwork } from '@3loop/transaction-decoder'
import { Effect } from 'effect'

const getPublicClient = (chainID: number): Effect.Effect<PublicClientObject, UnknownNetwork> => {
  if (chainID === 1) {
    return Effect.succeed({
      client: createPublicClient({
        transport: http('https://rpc.ankr.com/eth'),
      }),
    })
  }
  return Effect.fail(new UnknownNetwork(chainID))
}
```
