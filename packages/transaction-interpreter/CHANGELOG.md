# @3loop/transaction-interpreter

## 0.11.21

### Patch Changes

- de087ad: Update typescript config, compilation and fix type inference
- Updated dependencies [de087ad]
  - @3loop/transaction-decoder@0.27.1

## 0.11.20

### Patch Changes

- Updated dependencies [d7ee3d8]
  - @3loop/transaction-decoder@0.27.0

## 0.11.19

### Patch Changes

- Updated dependencies [a8d9d5b]
  - @3loop/transaction-decoder@0.26.2

## 0.11.18

### Patch Changes

- bb03946: Bump effect and viem versions
- Updated dependencies [bb03946]
  - @3loop/transaction-decoder@0.26.1

## 0.11.17

### Patch Changes

- Updated dependencies [be8bc09]
  - @3loop/transaction-decoder@0.26.0

## 0.11.16

### Patch Changes

- Updated dependencies [47e002c]
  - @3loop/transaction-decoder@0.25.1

## 0.11.15

### Patch Changes

- Updated dependencies [d467b26]
- Updated dependencies [607b8c8]
  - @3loop/transaction-decoder@0.25.0

## 0.11.14

### Patch Changes

- dc5643e: Small fixes in 0x and erc 721 interpreters
- Updated dependencies [dc5643e]
  - @3loop/transaction-decoder@0.24.3

## 0.11.13

### Patch Changes

- Updated dependencies [47b4225]
  - @3loop/transaction-decoder@0.24.2

## 0.11.12

### Patch Changes

- 6fc9465: Add timestamp to interpreted transaction

## 0.11.11

### Patch Changes

- 6c8733a: Update moxie interpreter

## 0.11.10

### Patch Changes

- 5155fde: Fix interpreter crash during number formatting

## 0.11.9

### Patch Changes

- d98f867: Update ZeroEx interpreter to filter out fees

## 0.11.8

### Patch Changes

- Updated dependencies [da3a060]
  - @3loop/transaction-decoder@0.24.1

## 0.11.7

### Patch Changes

- 335b860: Fix ts error for 0x interpreter

## 0.11.6

### Patch Changes

- 2d17903: Update 0x interpretator
- Updated dependencies [611d1c4]
  - @3loop/transaction-decoder@0.24.0

## 0.11.5

### Patch Changes

- Updated dependencies [30fb052]
  - @3loop/transaction-decoder@0.23.1

## 0.11.4

### Patch Changes

- Updated dependencies [87fa837]
- Updated dependencies [87fa837]
  - @3loop/transaction-decoder@0.23.0

## 0.11.3

### Patch Changes

- Updated dependencies [3ebadac]
  - @3loop/transaction-decoder@0.22.2

## 0.11.2

### Patch Changes

- Updated dependencies [610f7e2]
  - @3loop/transaction-decoder@0.22.1

## 0.11.1

### Patch Changes

- Updated dependencies [a3dd631]
- Updated dependencies [a3dd631]
  - @3loop/transaction-decoder@0.22.0

## 0.11.0

### Minor Changes

- 7b1fedf: Add default categorization of swaps into fallback interpreter

### Patch Changes

- d058de3: Bump effect version to latest, and remove the separate schema package
- Updated dependencies [7b1fedf]
- Updated dependencies [d058de3]
- Updated dependencies [d058de3]
- Updated dependencies [d058de3]
  - @3loop/transaction-decoder@0.21.1

## 0.10.7

### Patch Changes

- Updated dependencies [0faa1fc]
  - @3loop/transaction-decoder@0.21.0

## 0.10.6

### Patch Changes

- Updated dependencies [657b68f]
  - @3loop/transaction-decoder@0.20.0

## 0.10.5

### Patch Changes

- Updated dependencies [8d492b6]
  - @3loop/transaction-decoder@0.19.4

## 0.10.4

### Patch Changes

- Updated dependencies [b1afc80]
  - @3loop/transaction-decoder@0.19.3

## 0.10.3

### Patch Changes

- Updated dependencies [f8dbcbd]
  - @3loop/transaction-decoder@0.19.2

## 0.10.2

### Patch Changes

- e47d781: Add basic interpretation for account abstaction transacitons by event
- Updated dependencies [461e16a]
  - @3loop/transaction-decoder@0.19.1

## 0.10.1

### Patch Changes

- b3db2e9: Fix default parsing of nft and token transfers

## 0.10.0

### Minor Changes

- 806075e: Add new safe interpretation and update std functions

### Patch Changes

- Updated dependencies [806075e]
- Updated dependencies [86c6e12]
  - @3loop/transaction-decoder@0.19.0

## 0.9.0

### Minor Changes

- 9d99f31: Add decoding of Gnosis Safe transacitons, rename DecodedTx type, update type used in methodCall

### Patch Changes

- 9d99f31: Add more contracts from base network
- Updated dependencies [d0ff5af]
  - @3loop/transaction-decoder@0.18.1

## 0.8.0

### Minor Changes

- 794b12e: Add interpreter that uses eval. Can be used if the code which is run is known safe ahead. Using this interpreter mode will be faster and use less memory, at the cost of requiring that the code is safe. Example of safe code is one that is stored directly in the code and not loaded from a remote environment.

## 0.7.1

### Patch Changes

- 4c5813e: Filter zero transfers from interpreted tx

## 0.7.0

### Minor Changes

- 4204de7: Add transfer interpretations to fallback interpreter

## 0.6.0

### Minor Changes

- dfeba79: Add option to specify interpreters based on event signature. Add new event-based interpreter.

### Patch Changes

- Updated dependencies [dfeba79]
  - @3loop/transaction-decoder@0.18.0

## 0.5.4

### Patch Changes

- Updated dependencies [1e074ac]
  - @3loop/transaction-decoder@0.17.0

## 0.5.3

### Patch Changes

- Updated dependencies [fddbd89]
- Updated dependencies [ff61db4]
- Updated dependencies [ff61db4]
  - @3loop/transaction-decoder@0.16.0

## 0.5.2

### Patch Changes

- Updated dependencies [a0336e2]
  - @3loop/transaction-decoder@0.15.2

## 0.5.1

### Patch Changes

- bb52260: Update all deps
- Updated dependencies [bb52260]
  - @3loop/transaction-decoder@0.15.1

## 0.5.0

### Minor Changes

- f7efaff: Throw InterpreterError during interpretation

### Patch Changes

- Updated dependencies [03306a6]
- Updated dependencies [76badf6]
  - @3loop/transaction-decoder@0.15.0

## 0.4.0

### Minor Changes

- 797da0f: Add more default interpreters and std functions
- d1579f1: Add default interpreters for erc20, erc721 and erc1155 contracts

### Patch Changes

- Updated dependencies [1e55653]
- Updated dependencies [68e2034]
- Updated dependencies [102fda3]
  - @3loop/transaction-decoder@0.14.0

## 0.3.0

### Minor Changes

- 215e045: Add a common data type to return it from all interpreters. Additionally added a couple of more examples of interpretators and a fallback interpretator.

### Patch Changes

- Updated dependencies [32af229]
  - @3loop/transaction-decoder@0.13.0

## 0.2.1

### Patch Changes

- af5093d: Add otel tracing spans
- Updated dependencies [d169992]
- Updated dependencies [af5093d]
  - @3loop/transaction-decoder@0.11.0

## 0.2.0

### Minor Changes

- 67b2286: Make interpreter layer scoped

## 0.1.0

### Minor Changes

- 0589145: The initial release of the transaction interpreter with QuickJS.

### Patch Changes

- Updated dependencies [0589145]
  - @3loop/transaction-decoder@0.10.0
