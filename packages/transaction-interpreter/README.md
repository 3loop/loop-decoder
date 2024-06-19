# Loop Interpreter

## Current Exploration

Initial implemnetation will load all the interpreters in one JavaScript bundle. This should not be a problem if used in a node environment or with a small amount of interpreters. We are open to explore approches that will allow an universal approch to dynamically import interpreters.

The current implementation uses 2 tables to quickly find the interpertation for a given contract. The first table is a map of contract address to the index of the contract in the second table. The second table is a list of all interpreters. This allows us to quickly access all the interpreters and share the same interpreter for multiple contracts.

To avoid security issues, we will run each interpreter in a QuickJS sandbox.

## Usage

Example how to run in browser environment:

```ts
import {
  Interpreter,
  QuickjsInterpreterLive,
  QuickjsConfig,
  TransactionInterpreter,
} from '@3loop/transaction-interpreter'
import { Effect, Layer } from 'effect'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'

// Create a QuickJS VM configuration
const config = Layer.succeed(QuickjsConfig, {
  variant: variant,
  runtimeConfig: { timeout: 1000 },
})

// Provide the QuickJS VM configuration to interpreter
const layer = Layer.provide(QuickjsInterpreterLive, config)

const decodedTx = {} // Decoded transaction

// Run interpreter over default interpreters
const runnable = Effect.gen(function* () {
  const interpreterService = yield* TransactionInterpreter

  // NOTE: Search the interpreter in the default interpreters
  const interpreter = interpreterService.findInterpreter(decodedTx)

  const interpretation = yield* interpreterService.interpretTx(decodedTx, interpreter)

  return interpretation
}).pipe(Effect.provide(layer))

return Effect.runPromise(runnable)
  .then((interpretation) => {
    console.log(interpretation)
  })
  .catch((e) => {
    console.error(e)
  })
```

## Build

All interpreters are stored in the `interpreters` directory. Each interpreter must export a function `transformEvent` and an array `contracts` that contains the concatenated chainid and contract address (`${chainId}:${address}`).

We use `bun` to run the script which compiles all interpreters into a format that can be consumed by the loop interpreter.

```bash
pnpm run build:intepreters
```

Then you can compile the library with

```bash
pnpm run build
```
