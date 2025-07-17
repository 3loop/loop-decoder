# @3loop/transaction-decoder

## 0.29.2

### Patch Changes

- c197f2d: Implement getMany for meta and abi sql store

## 0.29.1

### Patch Changes

- 7a408f8: Update ABI strategy errors and log levels

## 0.29.0

### Minor Changes

- 4401d28: Implement circuit breaker and request pool for abi and meta strategies

## 0.28.0

### Minor Changes

- 24d5c09: Add decoding of Account Abstraciton user operations

### Patch Changes

- a9a60c3: Bump effect to latest version
- 0294025: Errors logging improvements

## 0.27.1

### Patch Changes

- de087ad: Update typescript config, compilation and fix type inference

## 0.27.0

### Minor Changes

- d7ee3d8: BREAKING CHANGE: Changing the interface we use to declare ABI strategies and adding rate limiter per strategy. The Breaking Change will only affect you if you are declaring the store layers manually, if you are using the default stores you will not be affected.

  Example usage:

  ```ts
  EtherscanV2StrategyResolver({
    apikey: apikey,
    rateLimit: { limit: 5, interval: '2 seconds', algorithm: 'fixed-window' },
  })
  ```

## 0.26.2

### Patch Changes

- a8d9d5b: SQL Storage filter success matches from database for cases when multiple matches are stored in database

## 0.26.1

### Patch Changes

- bb03946: Bump effect and viem versions

## 0.26.0

### Minor Changes

- be8bc09: Make in-memory store more flexible by folllowing the same API as SQL

## 0.25.1

### Patch Changes

- 47e002c: Fix type error in recurive calldata decoding

## 0.25.0

### Minor Changes

- 607b8c8: Add minimal proxy support using whatsabi

### Patch Changes

- d467b26: Improved perfomance of loading proxies by adding batching and cahching of request

## 0.24.3

### Patch Changes

- dc5643e: Update from and to adresses to the Hex format

## 0.24.2

### Patch Changes

- 47b4225: Fix crash in experimental erc20 resolver when address is empty. We provide an empty address when we decode logs for errors

## 0.24.1

### Patch Changes

- da3a060: Do not decode internal calldata param without knowing the address

## 0.24.0

### Minor Changes

- 611d1c4: Add an id to each strategy to make each request to a strategy unique. Effect will cache the request in a single global cache, thus to avoid the same request of being cached across different strategies we added an unique id that will identify each request.

## 0.23.1

### Patch Changes

- 30fb052: Disable request caching for fetch strategy

## 0.23.0

### Minor Changes

- 87fa837: Add expermiental erc20 abi strategy and change how sql strategy is defined

### Patch Changes

- 87fa837: Fix timeout on strategy would stop fetching all strategies

## 0.22.2

### Patch Changes

- 3ebadac: Change primary key for sql cache table

## 0.22.1

### Patch Changes

- 610f7e2: Do not cache failed request to meta strategies

## 0.22.0

### Minor Changes

- a3dd631: Fix sql stores syntax

### Patch Changes

- a3dd631: Use TaggedRequest for request to allow for equality check for in-memory caching of requests

## 0.21.1

### Patch Changes

- 7b1fedf: Improve decoder error displaying
- d058de3: Bump effect version to latest, and remove the separate schema package
- d058de3: Fetch contract meta and contract abi in parallel when decoding a log
- d058de3: SQL stores will now die instead of failure if tables can't be created

## 0.21.0

### Minor Changes

- 0faa1fc: Added deep-nested decoding of calldata parameters for all transactions. Added 2 new keys to detect calldata in the parameters: \_data and \_target

## 0.20.0

### Minor Changes

- 657b68f: Add default sql stores based on @effect/sql for loading abi and contract meta

## 0.19.4

### Patch Changes

- 8d492b6: Add Etherscan V2 Abi data loader

## 0.19.3

### Patch Changes

- b1afc80: Fix in-memory meta store was missing access to PubliClient for RPC requests

## 0.19.2

### Patch Changes

- f8dbcbd: Add default in-memory stores for contract and abi

## 0.19.1

### Patch Changes

- 461e16a: Remove traverse library from dependecies

## 0.19.0

### Minor Changes

- 806075e: Decode all deep params of safe tx
- 86c6e12: Fix native transfer decoding

## 0.18.1

### Patch Changes

- d0ff5af: Add retries during proxy resolution

## 0.18.0

### Minor Changes

- dfeba79: Add human redable signature to decoded transaciton events

## 0.17.0

### Minor Changes

- 1e074ac: Allow disabling tracer for an RPC client thus relaying only on logs and receipt

## 0.16.0

### Minor Changes

- fddbd89: Add support for decoding calldata recursively for Multicall3 contract
- ff61db4: Return array of ABIs from AbiStrategy, this will allow us to match over multiple fragments when we have multiple matches for the same signature

### Patch Changes

- ff61db4: Propagate errors from loading ABIs up to the decoding

## 0.15.2

### Patch Changes

- a0336e2: Use hex addresses in interacted addresses list

## 0.15.1

### Patch Changes

- bb52260: Update all deps

## 0.15.0

### Minor Changes

- 03306a6: Fix store abi loader for fragments needs wrapping in square brakets to act as array
- 76badf6: Make trace and log addresses hexed

## 0.14.0

### Minor Changes

- 1e55653: Add all interacted addresses metadata to decoded transaction
- 68e2034: Use managed runtime inside vanilla api and allow passing a custom log level
- 102fda3: Fix decoding of logs that do not have parameters or if we could not decode their params

## 0.13.0

### Minor Changes

- 32af229: Separate ABI resolvers into fragment and full address abi

## 0.12.0

### Minor Changes

- fff83bc: Modify `set` in AbiStore to accept 2 parameters, key and value

## 0.11.0

### Minor Changes

- d169992: Refactor stores to call `set` when the data is not found in strategies. This introduces new types for store values, to
  be able to differentiate between a missing value, and one that was never requested.

  - 1.  `Success` - The data is found successfully in the store
  - 2.  `NotFound` - The data is found in the store, but is missing the value
  - 3.  `MetaEmpty` - The contract metadata is not found in the store

  This change requires the users of the library to persist the NotFound state. Having the NotFound state allows us
  to skip the strategy lookup, which is one of the most expensive operations when decoding transactions.

  We suggest to keep a timestamp for the NotFound state, and invalidate it after a certain period of time. This will
  ensure that the strategy lookup is not skipped indefinitely. Separately, users can upload their own data to the store.

### Patch Changes

- af5093d: Add otel tracing spans

## 0.10.0

### Minor Changes

- 0589145: The initial release of the transaction interpreter with QuickJS.

## 0.9.0

### Minor Changes

- 91e8563: Remove assetsSent and assetsReceived in favor of all transfers
- 126cd9b: Add errors array to the decoded transaction object

### Patch Changes

- e89aa70: Fix DAI transfer amount value

## 0.8.0

### Minor Changes

- 7f19bc0: Bump effect version to stable 3

## 0.7.0

### Minor Changes

- cd07d4d: Add utils for interpreations with QuickJS and Effect API
- 899cfaa: Add batching and caching for data loaders
- 8f5006a: Decode abi methods as a tree structure

### Patch Changes

- 899cfaa: Apply the same formatting for all projects in monorepo

## 0.6.0

### Minor Changes

- bf4a5fc: Add automatic resolvers for contract metadata
- fb481d6: Change interpretation from jsonata to js code using QuickJS

## 0.5.0

### Minor Changes

- 8310ae5: Breaking change, update transaction decoder to use viem instead of ethers.js

## 0.4.0

### Minor Changes

- a6d534a: Update Effect to stable version

## 0.3.0

### Minor Changes

- bcd03ed: Add all addresses involved in the transaction in the decode output
- eb73069: Allow having custom abi loader strategy per each chain

## 0.2.0

### Minor Changes

- 879da09: Add helpers for tx interpretations using jsonata

## 0.1.4

### Patch Changes

- 3c8bd17: Use tsup to build transaction-decoder

## 0.1.1

### Patch Changes

- cec2752: Fix wrong import from effect

## 0.1.0

### Minor Changes

- 2010280: Add a new API for resolving contract abi and contract meta

### Patch Changes

- e39622b: Add vanila api, proxy contract resolver and other small fixes

## 0.0.1

### Major Changes

- Initial release
