# @3loop/transaction-decoder

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
