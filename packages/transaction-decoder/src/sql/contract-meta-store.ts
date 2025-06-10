import { SqlClient } from '@effect/sql'
import { Effect, Layer } from 'effect'
import * as ContractMetaStore from '../contract-meta-store.js'
import { ContractData } from '../types.js'

// Utility function to build query conditions for a single key
const buildQueryForKey = (sql: SqlClient.SqlClient, { address, chainID }: { address: string; chainID: number }) => {
  return sql.and([sql`address = ${address.toLowerCase()}`, sql`chain = ${chainID}`])
}

// Convert database items to result format
const createResult = (
  items: readonly any[],
  address: string,
  chainID: number,
): ContractMetaStore.ContractMetaResult => {
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
}

// Build lookup map for efficient batch processing
const buildLookupMap = (allItems: readonly any[]) => {
  const lookupMap = new Map<string, any>()

  for (const item of allItems) {
    if (typeof item.address === 'string' && typeof item.chain === 'number') {
      const key = `${item.address.toLowerCase()}-${item.chain}`
      lookupMap.set(key, item)
    }
  }

  return lookupMap
}

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
            const query = buildQueryForKey(sql, { address, chainID })

            const items = yield* sql`
              SELECT * FROM ${table}
              WHERE ${query}
            `.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            return createResult(items, address, chainID)
          }),

        getMany: (params) =>
          Effect.gen(function* () {
            if (params.length === 0) return []

            // Single database query for all keys
            const conditions = params.map((key) => buildQueryForKey(sql, key))
            const batchQuery = sql.or(conditions)

            const allItems = yield* sql`
              SELECT * FROM ${table}
              WHERE ${batchQuery}
            `.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            // Build efficient lookup map once
            const lookupMap = buildLookupMap(allItems)

            // Process results for each key using lookup map
            return params.map(({ address, chainID }) => {
              const key = `${address.toLowerCase()}-${chainID}`
              const item = lookupMap.get(key)
              const items = item ? [item] : []

              return createResult(items, address, chainID)
            })
          }),
      })
    }),
  )
