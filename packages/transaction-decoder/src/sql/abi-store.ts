import { AbiStore, ContractAbiResult } from '../effect.js'
import { Effect, Layer } from 'effect'
import { SqlClient } from '@effect/sql'

export const make = (strategies: AbiStore['strategies']) =>
  Layer.effect(
    AbiStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const table = sql('loop_decoder_contract_abi__')

      // TODO; add timestamp to the table
      yield* sql`
        CREATE TABLE IF NOT EXISTS ${table} (
          type TEXT NOT NULL,
          address TEXT,
          event TEXT,
          signature TEXT,
          chain INTEGER,
          abi TEXT,
          status TEXT NOT NULL
        )
      `.pipe(
        Effect.tapError(Effect.logError),
        Effect.catchAll(() => Effect.dieMessage('Failed to create contractAbi table')),
      )

      return AbiStore.of({
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
