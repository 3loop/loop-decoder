---
'@3loop/transaction-decoder': minor
---

BREAKING CHANGE: Changing the interface we use to declare ABI strategies and adding rate limiter per strategy. The Breaking Change will only affect you if you are declaring the store layers manually, if you are using the default stores you will not be affected.

Example usage:

```ts
EtherscanV2StrategyResolver({
  apikey: apikey,
  rateLimit: { limit: 5, interval: '2 seconds', algorithm: 'fixed-window' },
})
```
