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
            // Create the v3 table first
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
          )`.pipe(Effect.tapError((error) => Effect.logError(`Failed to create v3 table during migration: ${error}`)))

            // Check if v2 table exists before attempting migration
            const v2TableExists = yield* q
              .onDialectOrElse({
                sqlite: () =>
                  q`SELECT name FROM sqlite_master WHERE type='table' AND name='_loop_decoder_contract_abi_v2'`,
                pg: () => q`SELECT tablename FROM pg_tables WHERE tablename='_loop_decoder_contract_abi_v2'`,
                mysql: () =>
                  q`SELECT table_name FROM information_schema.tables WHERE table_name='_loop_decoder_contract_abi_v2'`,
                orElse: () => q`SELECT COUNT(*) as count FROM ${tableV2} WHERE 1=0`, // Try to query table directly
              })
              .pipe(
                Effect.map((rows) => rows.length > 0),
                Effect.catchAll(() => Effect.succeed(false)),
              )

            if (!v2TableExists) {
              yield* Effect.logInfo('No v2 table found, skipping data migration')
              return
            }

            // Check if there's any data to migrate
            const v2Count = yield* q`SELECT COUNT(*) as count FROM ${tableV2}`.pipe(
              Effect.map((rows) => rows[0]?.count || 0),
              Effect.catchAll(() => Effect.succeed(0)),
            )

            if (v2Count === 0) {
              yield* Effect.logInfo('v2 table is empty, skipping data migration')
              return
            }

            yield* Effect.logInfo(`Starting migration of ${v2Count} records from v2 to v3 table`)

            const tsCoalesce = q.onDialectOrElse({
              sqlite: () => q`COALESCE(timestamp, CURRENT_TIMESTAMP)`,
              pg: () => q`COALESCE(timestamp, CURRENT_TIMESTAMP)`,
              mysql: () => q`IFNULL(timestamp, CURRENT_TIMESTAMP)`,
              orElse: () => q`CURRENT_TIMESTAMP`,
            })

            // Migrate data with improved error handling, preserving IDs
            yield* q`
              INSERT INTO ${tableV3} (
                id,
                type,
                address,
                chain,
                signature,
                event,
                abi,
                status,
                timestamp,
                source
              )
              SELECT
                v.id,
                v.type,
                v.address,
                v.chain,
                v.signature,
                v.event,
                v.abi,
                v.status,
                ${tsCoalesce} as timestamp,
                'unknown' as source
              FROM ${tableV2} as v
              WHERE NOT EXISTS (
                SELECT 1 FROM ${tableV3} t
                WHERE t.id = v.id
              )
            `.pipe(
              Effect.tap(() => Effect.logInfo('Successfully migrated ABIs from v2 to v3 table with preserved IDs')),
              Effect.tapError((error) => Effect.logError(`Failed to migrate ABIs from v2 to v3 table: ${error}`)),
            )
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
              const insertData = {
                type: abi.type,
                address: normalizedAddress,
                chain: key.chainID,
                abi: abi.abi,
                status: abi.status,
                source: abi.source || 'unknown',
              }
              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([insertData])}
              `
            } else {
              const insertData = {
                type: abi.type,
                event: 'event' in abi ? abi.event : null,
                signature: 'signature' in abi ? abi.signature : null,
                abi: abi.abi,
                status: abi.status,
                source: abi.source || 'unknown',
              }
              yield* sql`
                INSERT INTO ${table}
                ${sql.insert([insertData])}
              `
            }
          }).pipe(
            Effect.tapError((error) =>
              Effect.logError(
                `Failed to insert ABI into database for ${abi.type} key (address: ${key.address}, chainID: ${
                  key.chainID
                }). ABI status: ${abi.status}, ABI length: ${abi.abi?.length || 'null'}, source: ${
                  abi.source || 'unknown'
                }. Error: ${error}`,
              ),
            ),
            Effect.catchAll(() => {
              return Effect.succeed(null)
            }),
          ),

        get: ({ address, signature, event, chainID }) =>
          Effect.gen(function* () {
            const query = buildQueryForKey(sql, { address, signature, event, chainID })

            const items = yield* sql` SELECT * FROM ${table} WHERE ${query}`.pipe(
              Effect.tapError((error) =>
                Effect.logError(
                  `Failed to query ABI from database for key (address: ${address}, signature: ${
                    signature || 'none'
                  }, event: ${event || 'none'}, chainID: ${chainID}): ${error}`,
                ),
              ),
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
              Effect.tapError((error) =>
                Effect.logError(`Failed to query ABIs from database for batch of ${keys.length} keys: ${error}`),
              ),
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
              Effect.tapError((error) =>
                Effect.logError(`Failed to update ABI status in database for id ${id} to status '${status}': ${error}`),
              ),
              Effect.catchAll(() => Effect.succeed(null)),
            )
          }),
      })
    }),
  )
