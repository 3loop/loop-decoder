# Loop Decoder

[![Action status](https://github.com/3loop/loop-decoder/actions/workflows/pull-request.yml/badge.svg)](https://github.com/3loop/loop-decoder/actions/workflows/pull-request.yml)

## Decode and interpret any EVM-based transactions

A library to transform any EVM transaction into a human-readable format. It consists of 2 parts:

- [Transaction decoder](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-decoder)
- [Transaction interpreter](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-interpreter)

## Documentation

[Head to the documentation](https://loop-decoder.3loop.io/) to read and learn more about the Loop Decoder, or check out our [playground](https://loop-decoder-web.vercel.app/) to see it in action.

## Why

Transaction decoding is a crucial component of many dApps. Our goal is to create a library that can be integrated into any application without introducing any external infrastructure dependencies. This will allow developers to integrate decoding and interpretation into their stack without enforcing any data sources.

Currently, the available EVM transaction decoders require developers to use specific databases or provide a lower-level API that requires maintenance. The Loop Decoder, however, can be used as a plug-and-play component in any layer of dApp infrastructure.

## Features

- [x] Can be used in any JavaScript environment
- [x] Minimal external dependencies - connect your own storage
- [x] Predefined ABI and Contract metadata resolvers
- [x] Flexible interpreter that allows you to define any custom interpretation of EVM transactions.

## Examples

- [Decoder HTTP Server](https://github.com/3loop/decoder-api) - A simple HTTP server that exposes an REST API to decode transactions.

## Monorepo Structure

- `apps`
  - [docs](https://github.com/3loop/loop-decoder/tree/main/apps/docs) - Documentation website using astro starlight.
  - [web](https://github.com/3loop/loop-decoder/tree/main/apps/docs) - Interactive playground based on Next.js.
- `packages`
  - [transaction-decoder](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-decoder) - Transaction decoder package
  - [transaction-interpreter](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-interpreter) - Transaction interpreters
  -

## Looking for feedback

Please let us know about your use cases and how this project can help you. You can reach us on Twitter [@nastyarods](https://twitter.com/nastyarods) and [@Ferossgp](https://twitter.com/Ferossgp), or through email at [contact@3loop.io](mailto:contact@3loop.io).
