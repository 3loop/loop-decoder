# Loop Decoder

[![Action status](https://github.com/3loop/loop-decoder/actions/workflows/pull-request.yml/badge.svg)](https://github.com/3loop/loop-decoder/actions/workflows/pull-request.yml)

## Decode and interpret any EVM-based transactions

A library to transform any EVM transaction into a human-readable format. It consists of 2 parts:

- [Transaction decoder](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-decoder)
- [Transaction interpreter](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-interpreter)

![Screenshot 2024-10-17 at 13 05 55](https://github.com/user-attachments/assets/c5f87539-7b21-43fe-8e8a-39359322e547)

## Documentation

[Head to the documentation](https://loop-decoder.3loop.io/) to read and learn more about the Loop Decoder, or check out our [playground](https://loop-decoder-web.vercel.app/) to see it in action.

## Contribution to Interpretations

If you're familiar with a specific contract or protocol, or want your own contracts to appear in human-readable interpretations, please contribute to Transaction Interpreter! Check out our [Contribution Guide](https://loop-decoder.3loop.io/contribution/) to learn how to get started.

## Why

Transaction decoding is a crucial component of many dApps. Our goal is to create a library that can be integrated into any application without introducing any external infrastructure dependencies. This will allow developers to integrate decoding and interpretation into their stack without enforcing any data sources.

Currently, the available EVM transaction decoders require developers to use specific databases or provide a lower-level API that requires maintenance. The Loop Decoder, however, can be used as a plug-and-play component in any layer of dApp infrastructure.

The open-source nature of the Loop Decoder allows developers to also integrate new chains as they see fit. While using a third party closed-source decoder, developers are limited to the chains that the provider supports. This can be a significant burden for developers who want to support multiple emerging chains.

### Glossary

- **Transaction Decoder**: Decoder automates the decoding of any transaction data, event log and trace, in a unified format. We leverage multiple data sources for contract metadata and ABI resolution. With an unified interface to decode transactions across any protocol, developers don't have to manually understand and decode each individual transactions.
- **Transaction Interpreter**: Interpreter is a flexible layer that allows developers to define custom interpretation of a decoded transactions. In context of this library, an interpretation is a transformation from a decoded transaction to a human-readable format. It is used to extract the most significant information that can be directly displayed to a non techincal user.

## Features

- [x] Can be used in any JavaScript environment
- [x] Minimal external dependencies - connect your own storage
- [x] Predefined ABI and Contract metadata resolvers
- [x] Resolves contract proxise and multicalls
- [x] Flexible interpreter that allows you to define any custom interpretation of EVM transactions.

## Examples

- [Decoder HTTP Server](https://github.com/3loop/decoder-api) - A simple HTTP server that exposes an REST API to decode transactions.
- [Firebase Push Notifications](https://github.com/3loop/example-push-notifications) - Firebase Cloud Function that sends push notifications with decoded transactions.
- [Farcaster Bot](https://loop-decoder.3loop.io/recipes/fc-bot/) - Farcaster Bot for human-readable transaction alerts
- [Telegram Bot](https://loop-decoder.3loop.io/recipes/tg-bot/) - Telegram Bot for human-readable transaction alerts
- [Next.JS Playground](https://github.com/3loop/loop-decoder/tree/main/apps/web) - Interactive playground to decode and interpret transactions

## Monorepo Structure

- `apps`
  - [docs](https://github.com/3loop/loop-decoder/tree/main/apps/docs) - Documentation website using astro starlight.
  - [web](https://github.com/3loop/loop-decoder/tree/main/apps/docs) - Interactive playground based on Next.js.
- `packages`
  - [transaction-decoder](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-decoder) - Transaction decoder package
  - [transaction-interpreter](https://github.com/3loop/loop-decoder/tree/main/packages/transaction-interpreter) - Transaction interpreters

## Looking for feedback

Please let us know about your use cases and how this project can help you. You can reach us on Twitter [@nastyarods](https://twitter.com/nastyarods) and [@Ferossgp](https://twitter.com/Ferossgp), or through email at [contact@3loop.io](mailto:contact@3loop.io).
