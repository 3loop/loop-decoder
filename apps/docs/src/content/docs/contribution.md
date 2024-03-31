---
title: Contribution
description: How to contribute to Loop Decoder
---

Loop Decoder is an open-source project and we welcome contributions of all kinds. There are many ways to help, from reporting issues, contributing code, and helping us improve our community. All the development of Loop Decoder happens on [GitHub](github.com/3loop/loop-decoder).

### Release with Changeset

When adding a new feature, please use the [Changeset](https://github.com/changesets/changesets) tool to create a new release. This will automatically update the changelog and create a new release on GitHub.

To create a new changelog, run the following command:

```
$ pnpm changeset
```

To create a new release, one of the maintainers will merge the changeset PR into the main branch. This will trigger a new release to npm.

### Credits

Some ideas for the decoder and interpreter were inspired by open-source software. Special thanks to:

-   [EVM Translator](https://github.com/metagame-xyz/evm-translator) - some data types and data manipulations were heavily inspired by this source.
