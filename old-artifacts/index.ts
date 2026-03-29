/**
 * packages/db/schema/index.ts
 *
 * Barrel export for the entire schema.
 * Import everything from here in the Drizzle client and drizzle.config.ts.
 *
 * Usage in client.ts:
 *   import * as schema from "./schema"
 *   export const db = drizzle(sql, { schema })
 *
 * Usage in drizzle.config.ts:
 *   schema: "./src/schema/index.ts"
 */

export * from "./enums"
export * from "./auth"
export * from "./accounts"
export * from "./classification"
export * from "./imports"
export * from "./recurring"
export * from "./transactions"
export * from "./budgets"
export * from "./investments"
export * from "./notifications"
export * from "./relations"
