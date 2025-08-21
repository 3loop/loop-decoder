---
'@3loop/transaction-decoder': minor
---

BREAKING! This version changes the public API for ABI store. If you use built in stores evrything should work out of the box. When using SQL store ensure that migrations complete on start. Additionally the AbiLoader will now also return an array of ABIs when accessing the cached data. These changes allows us to run over multiple ABIs when decoding a transaction, instead of failing when the cached ABI is wrong.
