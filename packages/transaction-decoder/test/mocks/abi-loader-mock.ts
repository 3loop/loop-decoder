import { Effect, Layer, Match } from 'effect'
import fs from 'node:fs'
import { AbiStore } from '@/abi-loader.js'
// import { FourByteStrategyResolver } from '@/effect.js'
// import { EtherscanStrategyResolver } from '@/abi-strategy/index.js'

export const MockedAbiStoreLive = Layer.succeed(
  AbiStore,
  AbiStore.of({
    strategies: {
      default: [
        // Run only when adding a new test case
        // EtherscanStrategyResolver()
        // FourByteStrategyResolver(),
      ],
    },
    set: (key, response) =>
      Effect.gen(function* () {
        if (response.status !== 'success') return

        const { key, value } = Match.value(response.result).pipe(
          Match.when({ type: 'address' } as const, (value) => ({
            key: value.address.toLowerCase(),
            value: value.abi,
          })),
          Match.when({ type: 'func' } as const, (value) => ({
            key: value.signature.toLowerCase(),
            value: value.abi,
          })),
          Match.when({ type: 'event' } as const, (value) => ({
            key: value.event.toLowerCase(),
            value: value.abi,
          })),
          Match.exhaustive,
        )

        yield* Effect.sync(() => fs.writeFileSync(`./test/mocks/abi/${key}.json`, value))
      }),
    get: ({ address, signature, event }) =>
      Effect.gen(function* () {
        const addressExists = yield* Effect.sync(() => fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`))

        if (addressExists) {
          const abi = yield* Effect.sync(
            () => fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString(),
          )

          return {
            status: 'success',
            result: {
              type: 'address',
              abi,
              address,
              chainID: 1,
            },
          }
        }

        const sig = signature ?? event

        if (sig != null) {
          const signatureExists = yield* Effect.sync(() => fs.existsSync(`./test/mocks/abi/${sig.toLowerCase()}.json`))

          if (signatureExists) {
            const signatureAbi = yield* Effect.sync(
              () => fs.readFileSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)?.toString(),
            )

            if (signature) {
              return {
                status: 'success',
                result: {
                  type: 'func',
                  abi: signatureAbi,
                  address,
                  chainID: 1,
                  signature,
                },
              }
            } else if (event) {
              return {
                status: 'success',
                result: {
                  type: 'event',
                  abi: signatureAbi,
                  address,
                  chainID: 1,
                  event,
                },
              }
            }
          }
        }

        return {
          status: 'empty',
          result: null,
        }
      }),
  }),
)
