---
title: ABI Data Loaders
description: ABI Data Loaders Strategies used to fetch ABI data from third-party APIs.
---

`AbiStore` accepts an array of strategies that are used to resolve the ABI from third-party APIs when the ABI is missing in the store. If an ABI is successfully resolved, it is then cached in the store to avoid unecessary API requests.

## ABI Strategies

Loop Decoder provides some strategies out of the box:

- `EtherscanStrategyResolver` - resolves the ABI from Etherscan
- `SourcifyStrategyResolver` - resolves the ABI from Sourcify
- `FourByteStrategyResolver` - resolves the ABI from 4byte.directory
- `OpenchainStrategyResolver` - resolves the ABI from Openchain
- `BlockscoutStrategyResolver` - resolves the ABI from Blockscout

  You can create your own strategy by implementing the `GetContractABIStrategy` Effect RequestResolver.
