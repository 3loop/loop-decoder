export const aaveV2 = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9'

export const EXAMPLE_TXS = {
  'AAVE V2': [
    {
      name: 'Repay',
      hash: '0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7',
      chainID: 1,
    },
    {
      name: 'Deposit',
      hash: '0xe61092c0ce50d7cf7c43a060c3ca023f16f99729ccae7a6d011e408d93d6f93f',
      chainID: 1,
    },
    {
      name: 'Borrow',
      hash: '0x1fc39eea9247cd9aa9d311bf83666afa6c9b30d66515d313e4d04dcb07a73a8f',
      chainID: 1,
    },
    {
      name: 'Withdraw',
      hash: '0xf42e5d28e2fea319cf3675c57c57849ad5d178f17f8a17c94c7607321cf1b959',
      chainID: 1,
    },
  ],
  'NFTS BLUR': [
    {
      name: 'takeBidSingle',
      hash: '0x02a4dda78f1452772d87aa080d65ed7c34785b9d0f4c20aa6c91c51a63ee1fa4',
      chainID: 1,
    },
    {
      name: 'takeAskSingle',
      hash: '0x26260ddb60e640ee8cee513b3b6a6491ac1ba40fbb459cb2437e080d3143f313',
      chainID: 1,
    },
    {
      name: 'takeBid',
      hash: '0xb5c56b4213325cb3fba274d0467b40ab28d9d475ba4a652b46943251c3c0d697',
      chainID: 1,
    },
    {
      name: 'takeAsk',
      hash: '0x9ed41e3d626605673c282dc8a0f7429e7abcab112d6529b0c77ee43954202cab',
      chainID: 1,
    },
  ],
  'Account Abstraction': [
    {
      name: 'handleOps',
      hash: '0xcc1f4e40e1186503bb19b5716c8527947ab4c7e972b79d3d64ad8a015cf10ff8',
      chainID: 1,
    },
  ],
}

export const supportedChains = [
  {
    name: 'Ethereum Mainnet',
    chainID: 1,
    rpcUrl: (process.env.MAINNET_RPC_URL as string) ?? 'https://rpc.ankr.com/eth',
  },
  {
    name: 'Sepolia Testnet',
    chainID: 11155111,
    rpcUrl: (process.env.SEPOLIA_RPC_URL as string) ?? 'https://rpc.ankr.com/eth_sepolia',
  },
  {
    name: 'Base mainnet',
    chainID: 8453,
    rpcUrl: process.env.BASE_RPC_URL as string,
    supportTraceAPI: false,
    batchMaxCount: 1,
  },
  {
    name: 'Polygon Mainnet',
    chainID: 137,
    rpcUrl: (process.env.POLYGON_RPC_URL as string) ?? 'https://rpc.ankr.com/polygon',
    suppurtTraceAPI: true,
  },
  {
    name: 'Optimism Mainnet',
    chainID: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL as string,
    supportTraceAPI: false,
  },
  {
    name: 'Arbitrum One',
    chainID: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL as string,
    supportTraceAPI: false,
  },
  {
    name: 'Manta pacific',
    chainID: 169,
    rpcUrl: (process.env.MANTA_RPC_URL as string) ?? 'https://pacific-rpc.manta.network/http',
    supportTraceAPI: false,
  },
]

export const defaultTrasaction = EXAMPLE_TXS['AAVE V2'][0]
export const DEFAULT_CONTRACT = aaveV2
export const DEFAULT_CHAIN_ID = 1

const generateNavItems = (transactions: any) => {
  return transactions.map((tx: any) => ({
    href: `/tx/${tx.chainID}/${tx.hash}`,
    title: `${tx.name}`,
  }))
}

export const sidebarNavItems = Object.fromEntries(
  Object.entries(EXAMPLE_TXS).map(([key, value]) => [key, generateNavItems(value)]),
)
