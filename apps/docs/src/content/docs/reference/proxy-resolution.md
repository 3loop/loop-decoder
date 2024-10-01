---
title: Proxy Resolution
description: Proxy resolution is the process of resolving the address of a proxy contract to the address of the implementation contract.
sidebar:
  order: 3
---

Proxies are smart contracts that delegate calls to another contract, typically referred to as the implementation or logic contract. They allow the implementation to be updated without changing the proxy's address, ensuring that users continue interacting with the same address.

## Types of Proxies

#### 1. Standard Proxy

Standard proxies are primarily used for upgradeable contracts, allowing the implementation contract to be updated without changing the address of the proxy contract. They have a higher deployment cost.

Standard proxy contracts often use standardized storage slots to store the address of the implementation contract. The most common slot is the EIP-1967 standard, but there are also additional slots used by frameworks like OpenZeppelin or blockchain-specific implementations.

#### 2. Minimal Proxy

Minimal Proxies, also known as EIP-1167 proxies, are designed for efficient deployment of multiple instances of the same contract logic. They are not upgradeable and have a fixed implementation address.

#### 3. UUPS (Universal Upgradeable Proxy Standard)

UUPS proxies are an evolution of the standard proxy pattern. They move the upgrade functionality to the implementation contract, reducing the proxy contract's complexity and gas costs.

#### 4. Beacon Proxy

Beacon Proxies introduce an additional contract called a beacon, which stores the implementation address. Multiple proxy contracts can point to the same beacon, allowing for simultaneous upgrades of multiple proxies by updating the beacon's implementation address.

## Proxy Detection Methods

#### 1. Static Slot-Based Detection

This method checks specific storage slots in a contract (e.g., EIP-1967 or custom slots) to retrieve the implementation address. It's efficient but limited to proxies that follow standard storage patterns.

#### 2. Call-Based Detection

This approach involves analyzing how a contract responds to function calls, which can indicate whether it is delegating calls as a proxy. This method works for both standard and non-standard proxies but requires more computational resources.

#### 3. Bytecode Analysis

Examining a contract’s bytecode for specific patterns, such as delegatecall instructions, can help identify proxy contracts. This method is particularly useful for detecting Minimal Proxies

## How Loop Decoder resolves proxy contracts

Loop Decoder uses a static slot-based detection to identify proxy contracts. It checks for the presence of the implementation address in known storage slots by calling the `getStorageAt` RPC method.

```typescript
const storageSlots: Hex[] = [
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', //eipEIP1967
  '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3', //zeppelin
  // ... and more
]

storageSlots.map((slot) => {
  const res = await publicClient.getStorageAt({
    address: contractAddress,
    slot,
  })

  if (res === zeroSlot) {
    // if the slot is empty it means that this contract is not a proxy
    return undefined
  }

  return res
})
```
