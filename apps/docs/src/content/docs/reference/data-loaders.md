---
title: Data Loaders
description: Data Loaders used to fetch ABI and Contract Metadata required for decoding transactions
sidebar:
  order: 2
---

Data Loaders are mechanisms designed to retrieve the required ABI and Contract Metadata for transaction decoding. Internally, they automatically batch and cache requests when processing logs and traces in parallel. Users are encouraged to create a persistent store to cache data, thus avoiding unnecessary API requests. Additionally, the custom store should include all proprietary contracts.

The `AbiStore` and `ContractMetadataStore` accept strategies that resolve data from third-party APIs when the data is missing from the store. Upon successful resolution, the data is cached in the store to prevent unnecessary API requests in the future.

The Loop Decoder implements various optimizations to reduce the number of API requests made to third-party APIs. For instance, if the ABI of a contract is resolved from Etherscan, the ABI is then cached in the store. Subsequently, if the ABI is requested again, the store will return the cached ABI instead of making another API request.

## Contract metadata

Contract metadata is a collection of information about a contract, such as the contract's name, symbol, and decimals.

Loop Decoder provides some strategies out of the box:

- `ERC20RPCStrategyResolver` - resolves the contract metadata of an ERC20 token from the RPC
- `NFTRPCStrategyResolver` - resolves the contract metadata of an NFT token (ERC721, ERC1155) from the RPC
- `ProxyRPCStrategyResolver` - resolves the contract metadata of a Gnosis Safe proxy contract from the RPC

## ABI Strategies

ABI strategies will receive the contract address, and event or function signature as input and would return the ABI as a stringified JSON. Loop Decoder provides some strategies out of the box:

- `EtherscanStrategyResolver` - resolves the ABI from Etherscan, requires an API key to work properly
- `EtherscanV2StrategyResolver` - resolves the ABI from Etherscan v2, requires an API key to work properly
- `SourcifyStrategyResolver` - resolves the ABI from Sourcify
- `FourByteStrategyResolver` - resolves the ABI from 4byte.directory
- `OpenchainStrategyResolver` - resolves the ABI from Openchain
- `BlockscoutStrategyResolver` - resolves the ABI from Blockscout

You can create your strategy by implementing the `GetContractABIStrategy` Effect RequestResolver.
