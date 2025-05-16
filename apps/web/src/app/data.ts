export const aaveV2 = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9'

export const EXAMPLE_TXS = {
  'AAVE V2': [
    {
      name: 'Repay',
      hash: '0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7',
      chainID: 1,
      interpreter: 'aave',
    },
    {
      name: 'Deposit',
      hash: '0xe61092c0ce50d7cf7c43a060c3ca023f16f99729ccae7a6d011e408d93d6f93f',
      chainID: 1,
      interpreter: 'aave',
    },
    {
      name: 'Borrow',
      hash: '0x1fc39eea9247cd9aa9d311bf83666afa6c9b30d66515d313e4d04dcb07a73a8f',
      chainID: 1,
      interpreter: 'aave',
    },
    {
      name: 'Withdraw',
      hash: '0xf42e5d28e2fea319cf3675c57c57849ad5d178f17f8a17c94c7607321cf1b959',
      chainID: 1,
      interpreter: 'aave',
    },
  ],
  'Gnosis Safe': [
    {
      name: 'MultiTransfer',
      hash: '0xffc998f7f5765b475b91dfcffa609cef30ecee599703681d64b7c18aed60119b',
      chainID: 1,
      interpreter: 'gnosis-safe',
    },
    {
      name: 'Transfer',
      hash: '0x22a244794f155ce4a5765588353cf82dfc842c33ee3ed98e95ef488f6964f4fb',
      chainID: 1,
      interpreter: 'gnosis-safe',
    },
    {
      name: 'MultiSend',
      hash: '0x1ef9c179cf86d166437e4e214611ed3353590e0b65da48b20b3a2c717760066b',
      chainID: 1,
      interpreter: 'gnosis-safe',
    },
  ],
  'NFTS BLUR': [
    {
      name: 'Sell',
      hash: '0xb5c56b4213325cb3fba274d0467b40ab28d9d475ba4a652b46943251c3c0d697',
      chainID: 1,
      interpreter: 'blur',
    },
    {
      name: 'Buy',
      hash: '0x9ed41e3d626605673c282dc8a0f7429e7abcab112d6529b0c77ee43954202cab',
      chainID: 1,
      interpreter: 'blur',
    },
  ],
  'Account Abstraction': [
    {
      name: 'Gnosis 1',
      hash: '0xc7e7f073a1a92008ca40b2fabda1a03dd6911b421c6389e902f1b09bd8f7a7a0',
      chainID: 100,
      interpreter: 'aa',
    },
    {
      name: 'Gnosis 2',
      hash: '0xba2f3cc1e570d98368ec3d2a5e5cf5a80afc45f00639f7317ee19d00b8be6f09',
      chainID: 100,
      interpreter: 'aa',
    },
    {
      name: 'Base 1',
      hash: '0xc78ddb79bd7b9b1994b2680fbe51a33cc5e46a89edae6e3476ed1356277a1ad0',
      chainID: 8453,
      interpreter: 'aa',
    },
    {
      name: 'Base 2',
      hash: '0xe3fe2af860750fff01d1cc3a88e03daecd9fbb56b6894a9a2bdcb4d6f81cf0a3',
      chainID: 8453,
      interpreter: 'aa',
    },
  ],
  'Swap Transactions': [
    {
      name: '1inch',
      hash: '0x8e36953374f7b71fe4c20898c8ade628cf71d5d0303ec8ad368b254629db2985',
      chainID: 1,
      interpreter: '1inch',
    },
    {
      name: 'Kyberswap',
      hash: '0xfe429c6acf3c372270374122fe922282311bea31e09419f7fb167c6d8912372d',
      chainID: 1,
      interpreter: 'kyberswap',
    },
    {
      name: 'Metamask Router',
      hash: '0xcb2b8448a1f5dc7a29dc4ab3e79051e7460a4602b82ee5af2b3202c2e8b614de',
      chainID: 1,
      interpreter: 'metamaskRouter',
    },
    {
      name: 'OKX',
      hash: '0xf30013e82cd1197cb867f89ac33480699827282ca19ff49f0810a75e138ec869',
      chainID: 1,
      interpreter: 'okx',
    },
  ],
  'Bridge Transactions': [
    {
      name: 'Hop Protocol',
      hash: '0x7a7f39aee8c68f9be272b093f613280a8122291923edba83cc3f1f1754a70ecd',
      chainID: 1,
      interpreter: 'hop-protocol',
    },
  ],
  'Moxie (Base mainnet)': [
    {
      name: 'Sell',
      hash: '0x0f2540f5936228704cf94348085fb16fde87bfb554a76f0234dc8d5a804b0a7b',
      chainID: 8453,
      interpreter: 'moxie',
    },
    {
      name: 'Buy',
      hash: '0xc355f63566a9407d9a610b13f5e4e7fc64ce526f34503af18666904b63e0556f',
      chainID: 8453,
      interpreter: 'moxie',
    },
    {
      name: 'Burn',
      hash: '0x88833e8e873c09b3def62c2fe82f5ac3a20cdb936acce5ba27a5e4ab20417831',
      chainID: 8453,
      interpreter: 'moxie',
    },
  ],
}

export const supportedChains: {
  name: string
  chainID: number
  rpcUrl: string
  traceAPI?: 'parity' | 'geth' | 'none'
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
  },
  {
    name: 'Gnosis mainnet',
    chainID: 100,
    rpcUrl: process.env.GNOSIS_RPC_URL as string,
    // traceAPI: 'geth',
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
]

export const defaultTrasaction = EXAMPLE_TXS['AAVE V2'][0]
export const DEFAULT_CONTRACT = aaveV2
export const DEFAULT_CHAIN_ID = 1

const generateNavItems = (transactions: any, path: string) => {
  return transactions.map((tx: any) => ({
    url: `/${path}/${tx.chainID}/${tx.hash}`,
    title: `${tx.name}`,
  }))
}

export const geSidebarNavItems = (path: string) => {
  return Object.entries(EXAMPLE_TXS).map(([key, value]) => ({
    title: key,
    url: `#`,
    items: generateNavItems(value, path) as { url: string; title: string }[],
  }))
}

export const INTERPRETER_REPO = 'https://github.com/3loop/loop-decoder/tree/main/packages/transaction-interpreter'
