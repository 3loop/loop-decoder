import { Hex } from 'viem'

type TXS = {
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
    hash: '0xb98ca6d846d45556d0139a00be7314e32c0e8da7810db83ec6c9c0e7e44a7e10',
    chainID: 1,
  },
] as const

const AA_TRANSACTIONS = [
  {
    hash: '0xcc1f4e40e1186503bb19b5716c8527947ab4c7e972b79d3d64ad8a015cf10ff8',
    chainID: 1,
  },
] as const

export const TEST_TRANSACTIONS: TXS = [
  ...NFTS_BLUR,
  ...AA_TRANSACTIONS,
  {
    hash: '0xab701677e5003fa029164554b81e01bede20b97eda0e2595acda81acf5628f75',
    chainID: 5,
  },
  {
    hash: '0x7f040d831f20b530b42bb1ad1e1a8493e34f16b526fd324dc02e5ef5afad7c1e',
    chainID: 5,
  },
  {
    // NOTE: Failed transaction
    hash: '0xae500d717f8b7b646b1e5e66b3f3674eeca3535a54e3212fad613cce31fd2e27',
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
] as const
