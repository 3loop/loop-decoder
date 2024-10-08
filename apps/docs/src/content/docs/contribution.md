---
title: Contribution
description: How to contribute to Loop Decoder
---

Loop Decoder is an open-source project, and we welcome contributions of all kinds. You can help by reporting issues, contributing code, or improving our community. Development of Loop Decoder takes place on [GitHub](https://github.com/3loop/loop-decoder).

The most valuable contribution you can make is creating new interpretations. If you:

- Are familiar with a specific contract or protocol,
- Have deployed your own contracts,
- Or want to share your knowledge with the community to help others understand these contracts

please contribute to Loop Decoder! If you have any questions or need help, please reach out to us on any socials [X](https://x.com/3loop_io) or [Farcaster](https://warpcast.com/nastya).

## Creating a new interpretation

### Requirements

- Basic understanding of JavaScript and TypeScript
- TypeScript 5.x
- Node.js 20.x

### What is an interpretation

Interpretations are TypeScript functions that transform a decoded transaction into a human-readable format, extracting the most significant information. The `DecodedTransaction` is generated using the `@3loop/transaction-decoder` package, and interpretations are managed in the `@3loop/transaction-interpreter` package.

## Writing your first interpretation

### Step 1. Explore the Playground

We created a [Playground Web App](https://loop-decoder-web.vercel.app/) to help you quickly run and test interpretations. You can also run it locally using [Playground Localhost](http://localhost:3000/).

On the right sidebar, you’ll find example transactions with existing interpretations. For instance, you can open [AAVE V2 Repay](https://loop-decoder-web.vercel.app/tx/1/0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7) to view the JavaScript code and the corresponding interpretation result.

![Playground](../../assets/aave-v3.png)

You can modify the code to see how the result changes. Edits are saved locally, so you can return to the same page and continue later.

### Step 2. Decode the Target Transaction

To interpret a transaction, you need to understand its decoded structure. Use the [Playground](https://loop-decoder-web.vercel.app/) for this step.

Select the chain, paste the target transaction hash into the input field, and view the decoded transaction result in the bottom left field. Ensure the decoding is correct. If any errors or unexpected results arise, report them by creating an issue on [GitHub](https://github.com/3loop/loop-decoder/issues).

This decoded transaction serves as the input for your interpretation function.

### Step 3. Write an Interpretation

Each interpretation is a TypeScript file located in the `packages/transaction-interpreter/interpreters` directory. The file name should be unique and reflect the protocol or contract it covers.

Create a new file in the `interpreters` directory and copy the content from the [Fallback](https://github.com/3loop/loop-decoder/blob/main/packages/transaction-interpreter/interpreters/fallback.ts) interpretation, used for unsupported transactions.

The simplest interpretation is a `transformEvent` function that takes a `DecodedTransaction` and returns an `InterpretedTransaction`:

```ts
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import type { InterpretedTransaction } from '@/types.js'

function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return {
    type: 'unknown',
    chain: event.chainID,
    txHash: event.txHash,
    //...
  }
}
```

Update the copied function from the fallback interpretation to transform the input `DecodedTransaction` into an `InterpretedTransaction` with a human-readable description in the `action` field.

#### Step 3.1. Adding Contract Address or Event Names as Filters

Below the transformEvent function, add a filter object to specify when the interpretation applies. For contract-specific interpretations, list the contract addresses:

```ts
export const contracts = [
  '1:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
  '8453:0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4',
]
```

For event-specific interpretations, list the event names:

```ts
export const events = [
  'SubjectShareSold(address,address,uint256,address)',
  'SubjectShareBought(address,address,uint256,address)',
]
```

#### Step 3.2. Using helpers

The `@3loop/transaction-interpreter` package offers helper functions for handling `DecodedTransaction`. For example, you can retrieve the assets sent and received in a transaction:

```ts
import { assetsSent, assetsReceived, displayAddress } from '@/std.js'

function transformEvent(event: DecodedTransaction): InterpretedTransaction {
  return {
    type: 'unknown',
    chain: event.chainID,
    txHash: event.txHash,
    assetsSent: assetsSent(event.transfers, event.fromAddress),
    assetsReceived: assetsReceived(event.transfers, event.fromAddress),
    //...
  }
}
```

Feel free to use existing helpers from `std.ts` or create your own.

### Step 4. Share Your Interpretation

Create a new PR with your interpretation and add a description.

When adding a new feature, please use the [Changeset](https://github.com/changesets/changesets) tool to create a new release. This will automatically update the changelog and create a new release on GitHub.

To create a new changelog, run the following command:

```

$ pnpm changeset

```

To create a new release, one of the maintainers will merge the changeset PR into the main branch. This will trigger a new release to npm.

### Share Your Feedback

We would love to hear your thoughts on the Loop Decoder and how we can improve it. Please share your feedback on [X](https://x.com/3loop_io) or [Farcaster](https://warpcast.com/nastya).
