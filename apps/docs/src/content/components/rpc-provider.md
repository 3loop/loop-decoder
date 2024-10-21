```ts title="index.ts"
import { createPublicClient, http } from 'viem'

// Create a public client for the Ethereum Mainnet network
const getPublicClient = (chainId: number) => {
  return {
    client: createPublicClient({
      transport: http('https://rpc.ankr.com/eth'),
    }),
  }
}
```
