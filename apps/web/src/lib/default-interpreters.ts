// @ts-nocheck
import { Interpreter } from '@3loop/transaction-decoder'

const helpers = `
function assetsSent(transfers, fromAddress) {
    return transfers.filter((t) => t.from.toLowerCase() === fromAddress.toLowerCase())
}

function assetsReceived(transfers, fromAddress) {
    return transfers.filter((t) => t.to.toLowerCase() === fromAddress.toLowerCase())
}
`


export const defaultInterpreters: Interpreter[] = [
  {
    id: 'contract:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9,chain:1',
    schema: `${helpers}
function transformEvent(event) {
      const methodName = event.methodCall.name
      let action = ''

      const newEvent = {
        action: action,
        txHash: event.txHash,
        user: event.fromAddress,
        method: methodName,
        assetsSent: assetsSent(event.transfers, event.fromAddress),
        assetsReceived: assetsReceived(event.transfers, event.fromAddress),
      }

      switch (methodName) {
        case 'repay':
          action = 'User repaid ' + newEvent.assetsSent[1]?.amount + ' ' + newEvent.assetsSent[1]?.symbol
          break

        case 'deposit':
          action = 'User deposited ' + newEvent.assetsSent[0]?.amount + ' ' + newEvent.assetsSent[0]?.symbol
          break

        case 'borrow':
          action = 'User borrowed ' + newEvent.assetsReceived[1]?.amount + ' ' + newEvent.assetsReceived[1]?.symbol
          break

        case 'withdraw':
          action = 'User withdrew ' + newEvent.assetsReceived[0]?.amount + ' ' + newEvent.assetsReceived[0]?.symbol
          break
      }

      newEvent.action = action

      return newEvent
}

    `,
  },
  {
    id: 'contract:0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5,chain:1',
    schema: `${helpers}

function transformEvent(event) {
      const methodName = event.methodCall.name
      const _assetsSent = assetsSent(event.transfers, event.fromAddress)
      const _assetsReceived = assetsReceived(event.transfers, event.fromAddress)

      const newEvent = {
        txHash: event.txHash,
        method: methodName,
      }

      const sell = ['takeBidSingle']
      const batchSell = ['takeBid']
      const buy = ['takeAskSinglePool', 'takeAskSingle']
      const batchBuy = ['takeAsk']

      if (sell.includes(methodName)) {
        const nft = _assetsSent[0]
        const price = _assetsReceived[0].amount
        newEvent.sellerAddress = event.fromAddress
        newEvent.buyerAddress = event.methodCall.arguments[0].components[0].components[0].value
        newEvent.nftUrl = 'https://opensea.io/assets/ethereum/' + nft.address + '/' + nft.tokenId
        newEvent.action = nft.name + ' NFT sold for ' + price + ' ETH'
      }

      if (buy.includes(methodName)) {
        const nft = _assetsReceived[0]
        const price = _assetsSent[0].amount
        newEvent.buyerAddress = event.fromAddress
        newEvent.sellerAddress = event.methodCall.arguments[0].components[0].components[0].value
        newEvent.nftUrl = 'https://opensea.io/assets/ethereum/' + nft.address + '/' + nft.tokenId
        newEvent.action = nft.name + ' NFT sold for ' + price + ' ETH'
      }

      if (batchSell.includes(methodName)) {
        const nfts = _assetsSent
        const price = _assetsReceived[0].amount

        newEvent.sellerAddress = event.fromAddress
        newEvent.nftUrl = 'https://opensea.io/assets/ethereum/' + nfts[0]?.address
        newEvent.action = nfts.length + ' ' + nfts[0]?.name + ' NFTs sold for ' + price + ' ETH'
      }

      if (batchBuy.includes(methodName)) {
        const nfts = _assetsReceived
        const price = _assetsSent[0].amount

        newEvent.buyerAddress = event.fromAddress
        newEvent.nftUrl = 'https://opensea.io/assets/ethereum/' + nfts[0]?.address
        newEvent.action = nfts.length + ' ' + nfts[0]?.name + ' NFTs sold for ' + price + ' ETH'
      }

      return newEvent
}
    `,
  },
  {
    id: 'contract:0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789,chain:1',
    schema: `${helpers}

function transformEvent(event) {
      if (event.methodCall.name !== 'handleOps') return event

      const _assetsReceived = assetsReceived(event.transfers, event.fromAddress)

      const userOpEvents = event.interactions.filter((e) => e.event.eventName === 'UserOperationEvent')
      const isBatch = userOpEvents.length > 1

      const newEvent = {
        action:
          'Account Abstraction transaction by' + isBatch
            ? userOpEvents.length + ' adresses'
            : userOpEvents[0].event.params.sender,
        bundlerAddress: event.methodCall.arguments[1].value,
        entryPoint: event.toAddress,
        paymaster: userOpEvents[0].event.params.paymaster,
        fee: _assetsReceived[0]?.amount,
        userOps: userOpEvents.map((e) => {
          return { sender: e.event.params.sender, hash: e.event.params.userOpHash }
        }),
      }

      return newEvent
}`,
  },
]
