import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema/index'

// WebSocket mode: full transaction support + allows Neon compute to scale-to-zero.
// Node 22 provides native WebSocket globally — no 'ws' package needed.
// CRITICAL: neonConfig must be set BEFORE constructing the Pool.
// Note: Neon docs recommend TCP (postgres.js) for persistent servers; WebSocket is chosen
// here explicitly for scale-to-zero benefit (phase 02.1.1 D-05).
neonConfig.webSocketConstructor = globalThis.WebSocket

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

export const db = drizzle({ client: pool, schema })
