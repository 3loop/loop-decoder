import { Effect, Layer } from 'effect'
import fs from 'node:fs'
import { AbiStore } from '@/abi-loader.js'

export const MockedAbiStoreLive = Layer.succeed(
    AbiStore,
    AbiStore.of({
        strategies: [],
        set: ({ address = {}, signature = {} }) =>
            Effect.gen(function* (_) {
                const addressMatches = Object.entries(address)
                const sigMatches = Object.entries(signature)

                // Cache all addresses
                yield* _(
                    Effect.all(
                        addressMatches.map(([key, value]) =>
                            Effect.sync(() => fs.writeFileSync(`./test/mocks/abi/${key.toLowerCase()}.json`, value)),
                        ),
                    ),
                )

                // Cache all signatures
                yield* _(
                    Effect.all(
                        sigMatches.map(([key, value]) =>
                            Effect.sync(() => fs.writeFileSync(`./test/mocks/abi/${key.toLowerCase()}.json`, value)),
                        ),
                    ),
                )
            }),
        get: ({ address, signature, event }) =>
            Effect.gen(function* (_) {
                const addressExists = yield* _(
                    Effect.sync(() => fs.existsSync(`./test/mocks/abi/${address.toLowerCase()}.json`)),
                )

                if (addressExists) {
                    return yield* _(
                        Effect.sync(
                            () => fs.readFileSync(`./test/mocks/abi/${address.toLowerCase()}.json`)?.toString(),
                        ),
                    )
                }
                const sig = signature ?? event

                if (sig != null) {
                    const signatureExists = yield* _(
                        Effect.sync(() => fs.existsSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)),
                    )

                    if (signatureExists) {
                        const signatureAbi = yield* _(
                            Effect.sync(
                                () => fs.readFileSync(`./test/mocks/abi/${sig.toLowerCase()}.json`)?.toString(),
                            ),
                        )
                        return `[${signatureAbi}]`
                    }
                }

                return null
            }),
    }),
)
