import * as AbiStore from '../abi-store.js'
import { Effect, Layer } from 'effect'
import { SqlClient } from '@effect/sql'

export const make = (strategies: AbiStore.AbiStore['strategies']) =>
  Layer.effect(
    AbiStore.AbiStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const table = sql('_loop_decoder_contract_abi_v2')
      const id = sql.onDialectOrElse({
        sqlite: () => sql`id INTEGER PRIMARY KEY AUTOINCREMENT,`,
        pg: () => sql`id SERIAL PRIMARY KEY,`,
        mysql: () => sql`id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id),`,
        orElse: () => sql``,
      })

      // TODO; add timestamp to the table
      yield* sql`
        CREATE TABLE IF NOT EXISTS ${table} (
          ${id}
          type TEXT NOT NULL,
          address TEXT,
          event TEXT,
          signature TEXT,
          chain INTEGER,
          abi TEXT,
          status TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `.pipe(
        Effect.tapError(Effect.logError),
        Effect.catchAll(() => Effect.dieMessage('Failed to create contractAbi table')),
      )

      return yield* AbiStore.make({
        strategies,
        set: (key, value) =>
          Effect.gen(function* () {
            const normalizedAddress = key.address.toLowerCase()
            if (value.status === 'success' && value.result.type === 'address') {
              const result = value.result
              yield* sql`
              INSERT INTO ${table}
               ${sql.insert([
                 {
                   type: result.type,
                   address: normalizedAddress,
                   chain: key.chainID,
                   abi: result.abi,
                   status: 'success',
                 },
               ])}
            `
            } else if (value.status === 'success') {
              const result = value.result
              yield* sql`
              INSERT INTO ${table}
              ${sql.insert([
                {
                  type: result.type,
                  event: 'event' in result ? result.event : null,
                  signature: 'signature' in result ? result.signature : null,
                  abi: result.abi,
                  status: 'success',
                },
              ])}
            `
            } else {
              yield* sql`
              INSERT INTO ${table}
              ${sql.insert([
                {
                  type: 'address',
                  address: normalizedAddress,
                  chain: key.chainID,
                  status: 'not-found',
                },
              ])}
            `
            }
          }).pipe(
            Effect.tapError(Effect.logError),
            Effect.catchAll(() => {
              return Effect.succeed(null)
            }),
          ),

        get: ({ address, signature, event, chainID }) =>
          Effect.gen(function* () {
            const addressQuery = sql.and([
              sql`address = ${address.toLowerCase()}`,
              sql`chain = ${chainID}`,
              sql`type = 'address'`,
            ])

            const signatureQuery = signature ? sql.and([sql`signature = ${signature}`, sql`type = 'func'`]) : undefined
            const eventQuery = event ? sql.and([sql`event = ${event}`, sql`type = 'event'`]) : undefined
            const query =
              signature == null && event == null
                ? addressQuery
                : sql.or([addressQuery, signatureQuery, eventQuery].filter(Boolean))

            const items = yield* sql` SELECT * FROM ${table} WHERE ${query}`.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            const successItems = items.filter((item) => item.status === 'success')

            const item =
              successItems.find((item) => {
                // Prioritize address over fragments
                return item.type === 'address'
              }) ?? successItems[0]

            if (item != null) {
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
              } as AbiStore.ContractAbiResult
            } else if (items[0] != null && items[0].status === 'not-found') {
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
