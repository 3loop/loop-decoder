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
      name: 'Sell',
      hash: '0xb5c56b4213325cb3fba274d0467b40ab28d9d475ba4a652b46943251c3c0d697',
      chainID: 1,
    },
    {
      name: 'Buy',
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
  'Swap Transactions': [
    {
      name: '1inch',
      hash: '0x8e36953374f7b71fe4c20898c8ade628cf71d5d0303ec8ad368b254629db2985',
      chainID: 1,
    },
    {
      name: 'Kyberswap',
      hash: '0xfe429c6acf3c372270374122fe922282311bea31e09419f7fb167c6d8912372d',
      chainID: 1,
    },
    {
      name: 'Metamask Router',
      hash: '0xcb2b8448a1f5dc7a29dc4ab3e79051e7460a4602b82ee5af2b3202c2e8b614de',
      chainID: 1,
    },
    {
      name: 'OKX',
      hash: '0xf30013e82cd1197cb867f89ac33480699827282ca19ff49f0810a75e138ec869',
      chainID: 1,
    },
  ],
  'Bridge Transactions': [
    {
      name: 'Hop Protocol',
      hash: '0x7a7f39aee8c68f9be272b093f613280a8122291923edba83cc3f1f1754a70ecd',
      chainID: 1,
    },
  ],
  'Friend.Tech (Base mainnet)': [
    {
      name: 'Sell',
      hash: '0x9e18a3ab3faed1b13412e5cca532e083761410bb58e0423a5cd865a18a8e49a3',
      chainID: 8453,
    },
    {
      name: 'Buy',
      hash: '0x24067751e1bb553b8f5ccd6958edc3fa27489f9836bc0cd477383b143825dca5',
      chainID: 8453,
    },
  ],
}

export const supportedChains: {
  name: string
  chainID: number
  rpcUrl: string
  traceAPI?: 'parity' | 'geth' | 'none'
  batchMaxCount?: number
}[] = [
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
    traceAPI: 'geth',
    batchMaxCount: 1,
  },
  {
    name: 'Polygon Mainnet',
    chainID: 137,
    rpcUrl: (process.env.POLYGON_RPC_URL as string) ?? 'https://rpc.ankr.com/polygon',
    traceAPI: 'geth',
  },
  {
    name: 'Optimism Mainnet',
    chainID: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL as string,
    traceAPI: 'geth',
  },
  {
    name: 'Arbitrum One',
    chainID: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL as string,
    traceAPI: 'geth',
  },
  {
    name: 'Manta pacific',
    chainID: 169,
    rpcUrl: (process.env.MANTA_RPC_URL as string) ?? 'https://pacific-rpc.manta.network/http',
    traceAPI: 'geth',
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
