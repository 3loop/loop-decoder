import { PgClient } from '@effect/sql-pg'
import { Redacted } from 'effect'

export const DatabaseLive = PgClient.layer({
  url: Redacted.make(process.env.POSTGRES_URL!),
  ssl: true,
})
