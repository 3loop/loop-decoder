export const aaveV2 = "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9";
export const transactions = [
  {
    name: "Repay",
    hash: "0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7",
    chainID: 1,
  },
  {
    name: "Deposit",
    hash: "0xe61092c0ce50d7cf7c43a060c3ca023f16f99729ccae7a6d011e408d93d6f93f",
    chainID: 1,
  },
  {
    name: "Borrow",
    hash: "0x1fc39eea9247cd9aa9d311bf83666afa6c9b30d66515d313e4d04dcb07a73a8f",
    chainID: 1,
  },
  {
    name: "Withdraw",
    hash: "0xf42e5d28e2fea319cf3675c57c57849ad5d178f17f8a17c94c7607321cf1b959",
    chainID: 1,
  },
];

export const supportedChains = [
  {
    name: "Ethereum Mainnet",
    chainID: 1,
    rpcUrl:
      (process.env.MAINNET_RPC_URL as string) ?? "https://rpc.ankr.com/eth",
  },
  {
    name: "Goerli Testnet",
    chainID: 5,
    rpcUrl:
      (process.env.GOERLI_RPC_URL as string) ??
      "https://rpc.ankr.com/eth_goerli",
  },
  {
    name: "Base mainnet",
    chainID: 8453,
    rpcUrl: process.env.BASE_RPC_URL as string,
    supportTraceAPI: false,
    batchMaxCount: 1,
  },
  {
    name: "Manta pacific",
    chainID: 169,
    rpcUrl:
      (process.env.MANTA_RPC_URL as string) ??
      "https://pacific-rpc.manta.network/http",
    supportTraceAPI: false,
  },
];

export const defaultTrasaction = transactions[0];
export const DEFAULT_CONTRACT = aaveV2;
export const DEFAULT_CHAIN_ID = 1;
