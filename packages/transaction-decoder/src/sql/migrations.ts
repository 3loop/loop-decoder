import { Effect } from 'effect'
import { SqlClient } from '@effect/sql'

// _loop_decoder_migrations (
//   id TEXT PRIMARY KEY,          -- usually a timestamped name like 001_init
//   created_at TEXT NOT NULL      -- iso timestamp when applied
// )

export type Migration = {
  id: string
  up: (sql: SqlClient.SqlClient) => Effect.Effect<void, unknown, unknown>
}

const MIGRATIONS_TABLE = '_loop_decoder_migrations'

export const ensureMigrationsTable = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    const table = sql(MIGRATIONS_TABLE)

    // Create migrations table if it doesn't exist
    yield* sql`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  })

const getLatestAppliedMigration = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    try {
      const rows = yield* sql`SELECT id FROM ${sql(MIGRATIONS_TABLE)} ORDER BY id DESC LIMIT 1`
      const id = rows?.[0]?.id as string | undefined
      return id ?? null
    } catch {
      return null
    }
  })

export const runMigrations = (migrations: readonly Migration[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    yield* ensureMigrationsTable(sql)

    // compute latest applied (lexicographic order). Expect zero-padded ids like 001_...
    const latest = yield* getLatestAppliedMigration(sql)

    // filter only migrations with id greater than latest
    const pending = latest == null ? migrations : migrations.filter((m) => m.id > latest)

    for (const m of pending) {
      // Run each migration in a transaction when supported
      yield* sql.withTransaction(
        Effect.gen(function* () {
          const table = sql(MIGRATIONS_TABLE)
          // record as applied
          yield* sql`INSERT INTO ${table} (id) VALUES (${m.id})`
        }),
      )
    }
  })

// Helpers to define migrations succinctly
export const migration = (id: string, up: Migration['up']): Migration => ({ id, up })
