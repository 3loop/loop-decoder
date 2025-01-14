---
title: Proxy Resolution
description: Proxy resolution is the process of resolving the address of a proxy contract to the address of the implementation contract.
---

Proxy contracts are smart contracts that forward their calls to another contract - known as the implementation or logic contract. This pattern enables contract upgrades without changing the proxy's address, ensuring users can continue interacting with the same address.

Loop Decoder automatically detects and handles proxy contracts when resolving ABIs and decoding function parameters.

## Supported Proxy Types

| Proxy Type | Description                                        |
| ---------- | -------------------------------------------------- |
| EIP-1967   | The standard transparent proxy implementation.     |
| EIP-1167   | Minimal proxy implementation.                      |
| Safe       | Gnosis Safe multi-signature wallet implementation. |
| Zeppelin   | OpenZeppelin's proxy implementation.               |

## How Loop Decoder resolves proxy contracts

For each smart contract, Loop Decoder resolves the implementation address using standard JSON-RPC API calls and the following methods.

1. Bytecode analysis
2. Static slot-based detection
3. Call-based detection

### 1. Bytecode analysis

This method provides the most reliable and accurate way to detect proxy contracts. It examines the contract's bytecode to identify the delegatecall instruction.

For `EIP-1167` proxies, resolution occurs during this step. For other types, bytecode analysis generates a list of possible proxy implementations.

### 2. Static slot-based detection

This method examines specific storage slots in a contract (e.g., `EIP-1967` or custom slots) to retrieve the implementation address. While efficient, it only works with proxies that follow standard storage patterns.

### 3. Call-based detection

This approach analyzes how a contract responds to function calls, determining whether it delegates calls as a proxy. The method works for both standard and non-standard proxies but consumes more computational resources.

## Example

```typescript
import { getProxyImplementation } from '@3loop/transaction-decoder'

const implementationAddress = await getProxyImplementation({
  address: '0x1234567890abcdef',
  chainId: 1,
})
```
