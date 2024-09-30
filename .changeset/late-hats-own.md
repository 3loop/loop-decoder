---
'@3loop/transaction-interpreter': minor
---

Add interpreter that uses eval. Can be used if the code which is run is known safe ahead. Using this interpreter mode will be faster and use less memory, at the cost of requiring that the code is safe. Example of safe code is one that is stored directly in the code and not loaded from a remote environment.
