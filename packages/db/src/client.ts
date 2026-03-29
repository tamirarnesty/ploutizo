import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

// postgres.js client initialized at module scope — NOT per-request.
// Using direct Neon URL (not pooler) — postgres.js manages its own pool.
// See: https://orm.drizzle.team/docs/connect-neon
const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // tune later; start with default
})

export const db = drizzle({ client, schema })
