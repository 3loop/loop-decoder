import { Hex } from 'viem'

export const RPC = 'https://rpc.ankr.com/eth'
export const ZERO_SLOT = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const PROXY_SLOTS = [
  '0x747b7a908f10c8c0afdd3ea97976f30ac0c0d54304254ab3089ae5d161fc727a',
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
  '0xa619486e00000000000000000000000000000000000000000000000000000000',
] as const

type TXS = readonly {
  hash: Hex
  chainID: number
}[]

const NFTS_BLUR = [
  {
    // cancelTrades
    hash: '0x0f5cb8565e543d866a0477865575c20919e09c37c14588cf1878c91a47c6e37e',
    chainID: 1,
  },
  {
    // takeBid
    hash: '0xb5c56b4213325cb3fba274d0467b40ab28d9d475ba4a652b46943251c3c0d697',
    chainID: 1,
  },
  {
    //takeBidSingle
    hash: '0x02a4dda78f1452772d87aa080d65ed7c34785b9d0f4c20aa6c91c51a63ee1fa4',
    chainID: 1,
  },
  {
    //takeAskSinglePool
    hash: '0xf852866a9d10ab4713b00f3a012b7e60a48055a6f2cd99ae7efce205c390f710',
    chainID: 1,
  },
  {
    //takeAsk
    hash: '0x9ed41e3d626605673c282dc8a0f7429e7abcab112d6529b0c77ee43954202cab',
    chainID: 1,
  },
] as const

export const FAILED_TRANSACTIONS = [
  {
    //standart error message
    hash: '0x78b3bce497969c571bf4ac9a586679d01aff3410454380285c7e70a8ece2fd1f',
    chainID: 1,
  },
  {
    //without error message
    hash: '0x00da24c697c768216ba2bbfe06cfd7b28baaed1c8b095b6c0b682167f99044c0',
    chainID: 1,
  },
  {
    //custom error message
    hash: '0xb2c22e198d9fd3fe05c65a73879e79103c612f2f4d27e3e1615f231d1383ce40',
    chainID: 1,
  },
  {
    //out of gas
    hash: '0x0ec3122d1113c7159d653c4637dbd6af2f4696dde00761229c7e21801e48046b',
    chainID: 1,
  },
] as const

const AA_TRANSACTIONS = [
  {
    hash: '0xcc1f4e40e1186503bb19b5716c8527947ab4c7e972b79d3d64ad8a015cf10ff8',
    chainID: 1,
  },
] as const

const GNOSIS_SAFE_TRANSACTIONS = [
  {
    hash: '0xe6acfd7099db3c9bf94e7dab0052a9363cc9b6a33d91449ccc523bdd5d99861c',
    chainID: 1,
  },
  {
    hash: '0xabe682c315f7eb233c02618498b08dddf466513705d6402413016311844d3189',
    chainID: 1,
  },
  {
    hash: '0xbb07f5dbff6c4b7bdd26d0f9e2f7c6d41fd8f6eb5a5697832c45a738518cd284',
    chainID: 1,
  },
  {
    hash: '0x074e27d856aae900c2a16f8577baa4194a1c23daf54efe80faff4bb612e410ba',
    chainID: 1,
  },
] as const

const MULTICALL3_TRANSACTIONS = [
  {
    hash: '0x548af97ffad9b36b4ec40b403299dda5fac222c130cf4a3e2c4d438d88fe2280',
    chainID: 1,
  },
  {
    hash: '0xd83d86917c0a4b67b73bebce6822bd2545ea69e98e15a054bf4458258fd6d068',
    chainID: 1,
  },
  {
    hash: '0xf821984218cb5f28807cbcf08c7b08bff1bd397d078af437905718a6cad93b50',
    chainID: 1,
  },
  {
    hash: '0xea1f1d20b3a22301f8c2c4191b6e85d9659a308e4fd877bfa6576434ba4c1451',
    chainID: 1,
  },
] as const

const OTHER = [
  {
    hash: '0xde9f6210899218e17a3e71661ead5e16da228e168b0572b1ddc30a967968f8f6', // DAI
    chainID: 1,
  },
  {
    hash: '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75',
    chainID: 5,
  },
  {
    hash: '0x7f040d831f20b530b42bb1ad1e1a8493e34f16b526fd324dc02e5ef5afad7c1e',
    chainID: 5,
  },
  {
    hash: '0x8988e8a44d27b10bb3f6425b33d8249cc2206ca815faa234d93f2d1c01022a2d',
    chainID: 5,
  },
  {
    hash: '0xaf25e307654bed21aaec67fc439695fbed7cadf6c542cd97b4c5391f6c23f7bc',
    chainID: 5,
  },
  {
    hash: '0x695ed05f74461801e15d68768b784473de034156a81f12f3485bc157e4ac60c9',
    chainID: 5,
  },
  {
    hash: '0x65324c58b7c555d7fccfacfaa124f39c64405f6692069ea003ce100f08192bcd', //ERC-721
    chainID: 5,
  },
  {
    hash: '0x867ee0665a0e37bb52e5c2211b122ee952c358ee1d509c45b1157c2b3be8313c', //ERC-721 Mint
    chainID: 5,
  },
  {
    hash: '0x0235fc6d0c91f40bcbe627069be612464027913b2e95b23dcf2e647f330a22b4',
    chainID: 5,
  },
  {
    hash: '0x65954673ecca8c3c8939088f2eaa38ddad3cc2a96ab47c6b6a167548cf2da175',
    chainID: 5,
  },
  {
    hash: '0x1cf9beb600427c0fef7b4b5794f0f3eccef6a75cec1f1680b9295187effa3788', //ERC-1155 Mint
    chainID: 5,
  },
  {
    hash: '0x026fdb8b0017ef0e468e6d1627357adb9a8c4b6205ac0049bad80c253c76750c', // Disperse app
    chainID: 1,
  },
  {
    hash: '0x36f5c6d053ef3de0a412f871ead797d199d80dbc5ea4ba6ab1b1a211730aea13', //Uniswap Multicall
    chainID: 1,
  },
] as const

export const TEST_TRANSACTIONS: TXS = [
  ...NFTS_BLUR,
  ...AA_TRANSACTIONS,
  ...OTHER,
  ...MULTICALL3_TRANSACTIONS,
  ...GNOSIS_SAFE_TRANSACTIONS,
] as const

export const CALLDATA_TRANSACTIONS: TXS = [...OTHER.slice(-5)] as const
