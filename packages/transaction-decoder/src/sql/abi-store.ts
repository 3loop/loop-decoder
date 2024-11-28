import { AbiStore, ContractAbiResult } from '../effect.js'
import { Effect, Layer } from 'effect'
import { SqlClient } from '@effect/sql'

export const make = (strategies: AbiStore['strategies']) =>
  Layer.effect(
    AbiStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      yield* sql`
        CREATE TABLE IF NOT EXISTS contractAbi (
          type TEXT NOT NULL,
          address TEXT,
          event TEXT,
          signature TEXT,
          chain INTEGER,
          abi TEXT,
          status TEXT NOT NULL
        )
      `.pipe(Effect.catchAll(() => Effect.dieMessage('Failed to create contractAbi table')))

      return AbiStore.of({
        strategies,
        set: (key, value) =>
          Effect.gen(function* () {
            const normalizedAddress = key.address.toLowerCase()
            if (value.status === 'success' && value.result.type === 'address') {
              const result = value.result
              yield* sql`
              INSERT INTO contractAbi (type, address, chain, abi, status)
              VALUES (${result.type}, ${normalizedAddress}, ${result.chainID}, ${result.abi}, "success")
            `
            } else if (value.status === 'success') {
              const result = value.result
              yield* sql`
              INSERT INTO contractAbi (type, event, signature, abi, status)
              VALUES (${result.type}, ${'event' in result ? result.event : null}, ${
                'signature' in result ? result.signature : null
              }, ${result.abi}, "success")
            `
            } else {
              yield* sql`
              INSERT INTO contractAbi (type, address, chain, status)
              VALUES ("address", ${normalizedAddress}, ${key.chainID}, "not-found")
            `
            }
          }).pipe(Effect.catchAll(() => Effect.succeed(null))),

        get: ({ address, signature, event, chainID }) =>
          Effect.gen(function* () {
            const items = yield* sql`
            SELECT * FROM contractAbi
            WHERE (address = ${address.toLowerCase()} AND chain = ${chainID} AND type = "address")
              ${signature ? `OR (signature = ${signature} AND type = "func")` : ''}
              ${event ? `OR (event = ${event} AND type = "event")` : ''}
          `.pipe(Effect.catchAll(() => Effect.succeed([])))

            const item =
              items.find((item) => {
                // Prioritize address over fragments
                return item.type === 'address'
              }) ?? items[0]

            if (item != null && item.status === 'success') {
              return {
                status: 'success',
                result: {
                  type: item.type,
                  event: item.event,
                  signature: item.signature,
                  address,
                  chainID,
                  abi: item.abi,
                },
              } as ContractAbiResult
            } else if (item != null && item.status === 'not-found') {
              return {
                status: 'not-found',
                result: null,
              }
            }

            return {
              status: 'empty',
              result: null,
            }
          }),
      })
    }),
  )
