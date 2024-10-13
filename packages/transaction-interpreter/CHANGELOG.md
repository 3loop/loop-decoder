# @3loop/transaction-interpreter

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
