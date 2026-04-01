import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { db } from '@ploutizo/db'
import { orgs } from '@ploutizo/db/schema'
import { eq } from 'drizzle-orm'
import { updateHouseholdSettingsSchema } from '@ploutizo/validators'

const householdsRouter = new Hono()

// GET /settings — returns the org's settlementThreshold
householdsRouter.get('/settings', async (c) => {
  const { orgId } = getAuth(c)
  const [row] = await db
    .select({ settlementThreshold: orgs.settlementThreshold })
    .from(orgs)
    .where(eq(orgs.id, orgId!))
  return c.json({ data: { settlementThreshold: row?.settlementThreshold ?? null } })
})

// PATCH /settings — update the org's settlementThreshold
householdsRouter.patch('/settings', async (c) => {
  const { orgId } = getAuth(c)
  const result = updateHouseholdSettingsSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', errors: result.error.issues } }, 400)
  }
  const [updated] = await db
    .update(orgs)
    .set({ settlementThreshold: result.data.settlementThreshold, updatedAt: new Date() })
    .where(eq(orgs.id, orgId!))
    .returning()
  return c.json({ data: { settlementThreshold: updated?.settlementThreshold ?? null } })
})

export { householdsRouter }
