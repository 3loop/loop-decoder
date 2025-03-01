import { SqlClient } from '@effect/sql'
import { Effect, Layer } from 'effect'
import { ContractData } from '../effect.js'
import * as ContractMetaStore from '../contract-meta-store.js'

export const make = (strategies: ContractMetaStore.ContractMetaStore['strategies']) =>
  Layer.effect(
    ContractMetaStore.ContractMetaStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const table = sql('_loop_decoder_contract_meta_')

      yield* sql`
        CREATE TABLE IF NOT EXISTS ${table} (
          address TEXT NOT NULL,
          chain INTEGER NOT NULL,
          contract_name TEXT,
          token_symbol TEXT,
          decimals INTEGER,
          type TEXT,
          status TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (address, chain)
        )
      `.pipe(
        Effect.tapError(Effect.logError),
        Effect.catchAll(() => Effect.dieMessage('Failed to create contractMeta table')),
      )

      return yield* ContractMetaStore.make({
        strategies,
        set: (key, value) =>
          Effect.gen(function* () {
            if (value.status === 'success') {
              const name = value.result.contractName ?? ''
              const symbol = value.result.tokenSymbol ?? ''
              const decimals = value.result.decimals ?? undefined

              const clear = Object.fromEntries(
                Object.entries({
                  address: key.address.toLowerCase(),
                  chain: key.chainID,
                  contract_name: name,
                  token_symbol: symbol,
                  decimals,
                  type: value.result.type,
                  status: 'success',
                }).filter(([_, v]) => v !== undefined),
              )

              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([clear])}
              `
            } else {
              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([
                  {
                    address: key.address.toLowerCase(),
                    chain: key.chainID,
                    status: 'not-found',
                  },
                ])}
              `
            }
          }).pipe(
            Effect.tapError(Effect.logError),
            Effect.catchAll(() => Effect.succeed(null)),
          ),
        get: ({ address, chainID }) =>
          Effect.gen(function* () {
            const items = yield* sql`
            SELECT * FROM ${table}
            WHERE ${sql.and([sql`address = ${address.toLowerCase()}`, sql`chain = ${chainID}`])}
          `.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            const successItems = items.filter((item) => item.status === 'success')

            const item = successItems[0]

            if (item != null && item.status === 'success') {
              return {
                status: 'success',
                result: {
                  contractAddress: address,
                  contractName: item.contract_name,
                  tokenSymbol: item.token_symbol,
                  decimals: item.decimals,
                  type: item.type,
                  address,
                  chainID,
                } as ContractData,
              }
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
