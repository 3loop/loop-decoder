import * as AbiStore from '../abi-store.js'
import { Effect, Layer } from 'effect'
import { SqlClient } from '@effect/sql'
import { runMigrations, migration } from './migrations.js'

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

// Convert database items to result format - returns all ABIs with their individual status
const createResult = (items: readonly any[], address: string, chainID: number): AbiStore.ContractAbiResult => {
  return items.map((item) => ({
    type: item.type,
    event: item.event,
    signature: item.signature,
    address,
    chainID,
    abi: item.abi,
    id: item.id,
    source: item.source || 'unknown',
    status: item.status as 'success' | 'invalid' | 'not-found',
    timestamp: item.timestamp,
  }))
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

      const tableV3 = sql('_loop_decoder_contract_abi_v3')
      const tableV2 = sql('_loop_decoder_contract_abi_v2')
      const id = sql.onDialectOrElse({
        sqlite: () => sql`id INTEGER PRIMARY KEY AUTOINCREMENT,`,
        pg: () => sql`id SERIAL PRIMARY KEY,`,
        mysql: () => sql`id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id),`,
        orElse: () => sql``,
      })

      // TODO: Allow skipping migrations if users want to apply it manually
      // Run structured migrations (idempotent, transactional)
      yield* runMigrations([
        migration('001_create_contract_abi_v3', (q) =>
          Effect.gen(function* () {
            yield* q`CREATE TABLE IF NOT EXISTS ${tableV3} (
            ${id}
            type TEXT NOT NULL,
            address TEXT,
            event TEXT,
            signature TEXT,
            chain INTEGER,
            abi TEXT,
            status TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            source TEXT DEFAULT 'unknown'
          )`

            const tsCoalesce = q.onDialectOrElse({
              sqlite: () => q`COALESCE(timestamp, CURRENT_TIMESTAMP)`,
              pg: () => q`COALESCE(timestamp, CURRENT_TIMESTAMP)`,
              mysql: () => q`IFNULL(timestamp, CURRENT_TIMESTAMP)`,
              orElse: () => q`CURRENT_TIMESTAMP`,
            })

            yield* q`
              INSERT INTO ${tableV3} (type, address, chain, abi, status, timestamp, source)
              SELECT 'address' as type, v.address, v.chain, v.abi, v.status, ${tsCoalesce} as timestamp, 'unknown' as source
              FROM ${tableV2} as v
              WHERE v.type = 'address'
                AND v.address IS NOT NULL AND v.chain IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM ${tableV3} t
                  WHERE t.type = 'address' AND t.address = v.address AND t.chain = v.chain
                )
            `.pipe(Effect.catchAll(Effect.logError))

            yield* q`
              INSERT INTO ${tableV3} (type, signature, abi, status, timestamp, source)
              SELECT 'func' as type, v.signature, v.abi, v.status, ${tsCoalesce} as timestamp, 'unknown' as source
              FROM ${tableV2} as v
              WHERE v.type = 'func' AND v.signature IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM ${tableV3} t
                  WHERE t.type = 'func' AND t.signature = v.signature
                )
            `.pipe(Effect.catchAll(Effect.logError))

            yield* q`
              INSERT INTO ${tableV3} (type, event, abi, status, timestamp, source)
              SELECT 'event' as type, v.event, v.abi, v.status, ${tsCoalesce} as timestamp, 'unknown' as source
              FROM ${tableV2} as v
              WHERE v.type = 'event' AND v.event IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM ${tableV3} t
                  WHERE t.type = 'event' AND t.event = v.event
                )
            `.pipe(Effect.catchAll(Effect.logError))
          }),
        ),
      ])

      const table = tableV3

      return yield* AbiStore.make({
        strategies,
        set: (key, abi) =>
          Effect.gen(function* () {
            const normalizedAddress = key.address.toLowerCase()

            if (abi.type === 'address') {
              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([
                  {
                    type: abi.type,
                    address: normalizedAddress,
                    chain: key.chainID,
                    abi: abi.abi,
                    status: abi.status,
                    source: abi.source || 'unknown',
                  },
                ])}
              `
            } else {
              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([
                  {
                    type: abi.type,
                    event: 'event' in abi ? abi.event : null,
                    signature: 'signature' in abi ? abi.signature : null,
                    abi: abi.abi,
                    status: abi.status,
                    source: abi.source || 'unknown',
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

        updateStatus: (id, status) =>
          Effect.gen(function* () {
            yield* sql`
              UPDATE ${table}
              SET status = ${status}
              WHERE id = ${id}
            `.pipe(
              Effect.tapError(Effect.logError),
              Effect.catchAll(() => Effect.succeed(null)),
            )
          }),
      })
    }),
  )
