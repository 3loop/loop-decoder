# Loop Decoder

## Decode and interpret any EVM-based transactions

A library to transform any EVM transaction into a human-readable format. It consists of 2 parts:

- [Transaction decoder](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-decoder)
- Customizable transaction interpreter

## Why

Transaction decoding is a crucial component of many dApps. Our goal is to create a library that can be integrated into any application without introducing any external infrastructure dependencies. This will allow developers to integrate decoding and interpretation into their stack without enforcing any data sources.

Currently, the available EVM transaction decoders require developers to use specific databases or provide a lower-level API that requires maintenance. The Loop Decoder, however, can be used as a plug-and-play component in any layer of dApp infrastructure.

## Features

- [x] Can be used in any JavaScript environment
- [x] Minimal external dependencies - connect your own storage
- [x] Flexible interpreter that allows you to define any custom interpretation of EVM transactions.

## Looking for feedback

Please let us know about your use cases and how this project can help you. You can reach us on Twitter [@nastyarods](https://twitter.com/nastyarods) and [@Ferossgp](https://twitter.com/Ferossgp), or through email at [contact@3loop.io](mailto:contact@3loop.io).
