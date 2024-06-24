---
'@3loop/transaction-decoder': minor
---

Refactor stores to call `set` when the data is not found in strategies. This introduces new types for store values, to
be able to differentiate between a missing value, and one that was never requested.

- 1.  `Success` - The data is found successfully in the store
- 2.  `NotFound` - The data is found in the store, but is missing the value
- 3.  `MetaEmpty` - The contract metadata is not found in the store

This change requires the users of the library to persist the NotFound state. Having the NotFound state allows us
to skip the strategy lookup, which is one of the most expensive operations when decoding transactions.

We suggest to keep a timestamp for the NotFound state, and invalidate it after a certain period of time. This will
ensure that the strategy lookup is not skipped indefinitely. Separately, users can upload their own data to the store.
