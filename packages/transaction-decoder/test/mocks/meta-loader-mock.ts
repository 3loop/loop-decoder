import { ContractMetaStore } from '../../src/contract-meta-loader.js'
import { Effect, Layer } from 'effect'

const ERC1155_CONTRACTS = ['0x58c3c2547084cc1c94130d6fd750a3877c7ca5d2', '0x4bed3ae022fd201ab7185a9bc80cb8bf9819bb80']
const ERC721_CONTRACTS = ['0xc3e4214dd442136079df06bb2529bae276d37564']

export const MockedMetaStoreLive = Layer.succeed(
  ContractMetaStore,
  ContractMetaStore.of({
    strategies: {
      default: [],
    },
    get: ({ address, chainID }) =>
      Effect.sync(() => {
        if ('0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6' === address.toLowerCase()) {
          return {
            status: 'success',
            result: {
              address,
              chainID,
              contractName: 'Wrapped Ether',
              contractAddress: address,
              tokenSymbol: 'WETH',
              decimals: 18,
              type: 'WETH',
            },
          }
        }

        if (ERC1155_CONTRACTS.includes(address.toLowerCase())) {
          return {
            status: 'success',
            result: {
              address,
              chainID,
              contractName: 'Mock ERC1155 Contract',
              contractAddress: address,
              tokenSymbol: 'ERC1155',
              type: 'ERC1155',
            },
          }
        }

        if (ERC721_CONTRACTS.includes(address.toLowerCase())) {
          return {
            status: 'success',
            result: {
              address,
              chainID,
              contractName: 'Mock ERC721 Contract',
              contractAddress: address,
              tokenSymbol: 'ERC721',
              type: 'ERC721',
            },
          }
        }

        return {
          status: 'success',
          result: {
            address,
            chainID,
            contractName: 'Mock ERC20 Contract',
            contractAddress: address,
            tokenSymbol: 'ERC20',
            decimals: 18,
            type: 'ERC20',
          },
        }
      }),
    set: () =>
      Effect.sync(() => {
        console.debug('MockedMetaStoreLive.set not implemented in tests')
      }),
  }),
)
