---
'@3loop/transaction-decoder': minor
---

Add an id to each strategy to make each request to a strategy unique. Effect will cache the request in a single global cache, thus to avoid the same request of being cached across different strategies we added an unique id that will identify each request.
