---
title: Effect VS Vanilla JS APIs
description: Effect VS Vanilla JS APIs
sidebar:
  order: 1
---

Loop Decoder provides two APIs for the Data Store: Effect and Vanilla JS.

## Effect API

The Effect API is the most flexible and powerful one, and it utilizes the [Effect TS framework](https://effect.website/docs). This API uses:

- Effect's Layers for dependency injection
- Effect's Generator functions instead of standard async/await functions

## Vanilla JS API

The Vanilla JS API is a simpler alternative to the Effect API, but it still covers the main use cases related to data store. This API is ideal for:

- Projects that don't need advanced features and want to use some of the Built-in Stores
- Simpler implementations with Promise-based async/await
- Easier integration with existing JavaScript codebases

:::note
We recommend using the Effect API for most projects.
:::

## Project Examples

Effect API:

- [Web Playground](https://github.com/3loop/loop-decoder/blob/main/apps/web/src/lib/decode.ts) - always uses the latest version of Loop Decoder
- [Decoder API](https://github.com/3loop/decoder-api) - template for building your own Decoder API server with Loop Decoder

  - [Custom SQL Abi Store](https://github.com/3loop/decoder-api/blob/87bec4e70b9df36b62e8d2cf78721a7304e84ed6/src/decoder/abi-loader.ts)
  - [Custom SQL Contract Meta Store](https://github.com/3loop/decoder-api/blob/87bec4e70b9df36b62e8d2cf78721a7304e84ed6/src/decoder/meta-loader.ts)
  - [RPC Provider](https://github.com/3loop/decoder-api/blob/87bec4e70b9df36b62e8d2cf78721a7304e84ed6/src/decoder/provider.ts)
  - [Initializing the Decoder](https://github.com/3loop/decoder-api/blob/87bec4e70b9df36b62e8d2cf78721a7304e84ed6/src/main.ts#L22-L34)

Vanilla JS API:

- [Farcaster on-chain alerts bot](https://github.com/3loop/farcaster-onchain-alerts-bot/blob/f1b90c9de7550abcd4ad1097fba5c2eb5dc259df/src/decoder/decoder.ts) - template of the Farcaster bot, uses Vanilla JS API and custom in-memory stores
