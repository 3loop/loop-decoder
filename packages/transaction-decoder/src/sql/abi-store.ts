import * as AbiStore from '../abi-store.js'
import { Effect, Layer } from 'effect'
import { SqlClient } from '@effect/sql'

// Utility function to build query conditions for a single key
const buildQueryForKey = (
  sql: SqlClient.SqlClient,
  { address, signature, event, chainID }: { address: string; signature?: string; event?: string; chainID: number },
) => {
  const addressQuery = sql.and([
    sql`address = ${address.toLowerCase()}`,
    sql`chain = ${chainID}`,
    sql`type = 'address'`,
  ])

  const signatureQuery = signature ? sql.and([sql`signature = ${signature}`, sql`type = 'func'`]) : undefined
  const eventQuery = event ? sql.and([sql`event = ${event}`, sql`type = 'event'`]) : undefined

  return signature == null && event == null
    ? addressQuery
    : sql.or([addressQuery, signatureQuery, eventQuery].filter(Boolean))
}

// Convert database items to result format
const createResult = (items: readonly any[], address: string, chainID: number): AbiStore.ContractAbiResult => {
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
}

// Build single lookup map with prefixed keys
const buildLookupMap = (allItems: readonly any[]) => {
  const lookupMap = new Map<string, any[]>()

  const addToMap = (key: string, item: any) => {
    if (!lookupMap.has(key)) lookupMap.set(key, [])
    lookupMap.get(key)?.push(item)
  }

  for (const item of allItems) {
    // Address-based lookup: "addr:address_chain" (with same type check as original)
    if (typeof item.address === 'string' && typeof item.chain === 'number') {
      const addressKey = `addr:${item.address.toLowerCase()}_${item.chain}`
      addToMap(addressKey, item)
    }

    // Signature-based lookup: "sig:signature"
    if (item.signature && item.type === 'func') {
      const signatureKey = `sig:${item.signature}`
      addToMap(signatureKey, item)
    }

    // Event-based lookup: "event:event"
    if (item.event && item.type === 'event') {
      const eventKey = `event:${item.event}`
      addToMap(eventKey, item)
    }
  }

  return lookupMap
}

export const make = (strategies: AbiStore.AbiStore['strategies']) =>
  Layer.scoped(
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
            const query = buildQueryForKey(sql, { address, signature, event, chainID })

            const items = yield* sql` SELECT * FROM ${table} WHERE ${query}`.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            return createResult(items, address, chainID)
          }),

        getMany: (keys) =>
          Effect.gen(function* () {
            if (keys.length === 0) return []

            // Single database query for all keys
            const conditions = keys.map((key) => buildQueryForKey(sql, key))
            const batchQuery = sql.or(conditions)

            const allItems = yield* sql`SELECT * FROM ${table} WHERE ${batchQuery}`.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed([])),
            )

            // Build efficient lookup map once
            const lookupMap = buildLookupMap(allItems)

            // Process results for each key using lookup map
            return keys.map(({ address, signature, event, chainID }) => {
              const keyItems: any[] = []

              // Get address-based matches
              const addressKey = `addr:${address.toLowerCase()}_${chainID}`
              const addressItems = lookupMap.get(addressKey) || []
              keyItems.push(...addressItems)

              // Get signature-based matches
              if (signature) {
                const signatureKey = `sig:${signature}`
                const signatureItems = lookupMap.get(signatureKey) || []
                keyItems.push(...signatureItems)
              }

              // Get event-based matches
              if (event) {
                const eventKey = `event:${event}`
                const eventItems = lookupMap.get(eventKey) || []
                keyItems.push(...eventItems)
              }
              return createResult(keyItems, address, chainID)
            })
          }),
      })
    }),
  )
