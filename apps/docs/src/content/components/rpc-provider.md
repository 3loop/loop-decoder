```ts title="src/decoder/decoder.ts"
import { createPublicClient, http } from 'viem'

const getPublicClient = (chainId: number) => {
  return {
    client: createPublicClient({
      transport: http('https://rpc.ankr.com/eth'),
    }),
  }
}
```
