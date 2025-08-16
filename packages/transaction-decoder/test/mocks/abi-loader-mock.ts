/* eslint-disable turbo/no-undeclared-env-vars */
import { Effect, Match } from 'effect'
import * as fs from 'node:fs'
import * as AbiStore from '../../src/abi-store.js'
import { FourByteStrategyResolver } from '../../src/index.js'
import { EtherscanStrategyResolver } from '../../src/abi-strategy/index.js'

export const MockedAbiStoreLive = AbiStore.layer({
  strategies: {
    default:
      process.env.ETHERSCAN_API_KEY != null
        ? [
            // Run only when adding a new test case
            EtherscanStrategyResolver({ apikey: process.env.ETHERSCAN_API_KEY! }),
            FourByteStrategyResolver(),
          ]
        : [],
  },
  set: (key, response) =>
    Effect.gen(function* () {
      if (response.status !== 'success') return

      const { key, value } = Match.value(response).pipe(
        Match.when({ type: 'address' }, (response) => ({
          key: response.address.toLowerCase(),
          value: response.abi,
        })),
        Match.when({ type: 'func' }, (response) => ({
          key: response.signature.toLowerCase(),
          value: response.abi,
        })),
        Match.when({ type: 'event' }, (response) => ({
          key: response.event.toLowerCase(),
          value: response.abi,
        })),
        Match.exhaustive,
      )

      yield* Effect.sync(() => fs.writeFileSync(`./test/mocks/abi/${key}.json`, value))
    }),
  get: ({ address, signature, event }) =>
    Effect.gen(function* () {
      const results: AbiStore.ContractAbiResult = []

      const addressExists = yield* Effect.sync(() => fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`))

      if (addressExists) {
        const abi = yield* Effect.sync(() =>
          fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString(),
        )

        results.push({
          type: 'address',
          abi,
          address,
          chainID: 1,
          status: 'success',
        })
      }

      const sig = signature ?? event

      if (sig != null) {
        const signatureExists = yield* Effect.sync(() => fs.existsSync(`./test/mocks/abi/${sig.toLowerCase()}.json`))

        if (signatureExists) {
          const signatureAbi = yield* Effect.sync(() =>
            fs.readFileSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)?.toString(),
          )

          if (signature) {
            results.push({
              type: 'func',
              abi: signatureAbi,
              address,
              chainID: 1,
              signature,
              status: 'success',
            })
          } else if (event) {
            results.push({
              type: 'event',
              abi: signatureAbi,
              address,
              chainID: 1,
              event,
              status: 'success',
            })
          }
        }
      }

      return results
    }),
})
