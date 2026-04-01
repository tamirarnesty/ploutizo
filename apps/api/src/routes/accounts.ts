import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { db } from '@ploutizo/db'
import { accounts, accountMembers } from '@ploutizo/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { createAccountSchema, updateAccountSchema } from '@ploutizo/validators'

const accountsRouter = new Hono()

// GET / — returns accounts for the org, active only unless ?include=archived
accountsRouter.get('/', async (c) => {
  const { orgId } = getAuth(c)
  const includeArchived = c.req.query('include') === 'archived'
  const condition = includeArchived
    ? eq(accounts.orgId, orgId!)
    : and(eq(accounts.orgId, orgId!), isNull(accounts.archivedAt))
  const rows = await db.select().from(accounts).where(condition).orderBy(accounts.createdAt)
  return c.json({ data: rows })
})

// POST / — create account; optionally assign members in a transaction
accountsRouter.post('/', async (c) => {
  const { orgId } = getAuth(c)
  const result = createAccountSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', errors: result.error.issues } }, 400)
  }
  const { memberIds = [], ...accountData } = result.data
  const row = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(accounts)
      .values({ orgId: orgId!, ...accountData })
      .returning()
    if (memberIds.length > 0) {
      await tx
        .insert(accountMembers)
        .values(memberIds.map((memberId) => ({ accountId: inserted.id, memberId })))
    }
    return inserted
  })
  return c.json({ data: row }, 201)
})

// PATCH /:id — update account fields; replace members if memberIds provided
accountsRouter.patch('/:id', async (c) => {
  const { orgId } = getAuth(c)
  const id = c.req.param('id')
  const result = updateAccountSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', errors: result.error.issues } }, 400)
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { memberIds, ...updateData } = result.data as { memberIds?: string[]; [key: string]: unknown }
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(accounts)
      .set({ ...(updateData as Parameters<typeof tx.update>[0]), updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId!)))
      .returning()
    if (!rows.length) return null
    if (memberIds !== undefined) {
      await tx.delete(accountMembers).where(eq(accountMembers.accountId, id))
      if (memberIds.length > 0) {
        await tx
          .insert(accountMembers)
          .values(memberIds.map((memberId) => ({ accountId: id, memberId })))
      }
    }
    return rows[0]
  })
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found.' } }, 404)
  }
  return c.json({ data: updated })
})

// DELETE /:id/archive — soft-archive the account by setting archivedAt
accountsRouter.delete('/:id/archive', async (c) => {
  const { orgId } = getAuth(c)
  const id = c.req.param('id')
  const [updated] = await db
    .update(accounts)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId!)))
    .returning()
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found.' } }, 404)
  }
  return c.json({ data: updated })
})

export { accountsRouter }
