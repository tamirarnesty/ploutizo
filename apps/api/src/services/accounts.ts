import { db } from '@ploutizo/db'
import { NotFoundError } from '../lib/errors'
import {
  archiveAccount,
  fetchAccountById,
  insertAccount,
  insertAccountMembers,
  listAccountMemberDetails,
  listAccountMembers,
  listAccounts as listAccountsQuery,
  replaceAccountMembers,
  updateAccount as updateAccountQuery,
} from '../lib/queries/accounts'
import type { createAccountSchema, updateAccountSchema } from '@ploutizo/validators'
import type { z } from 'zod'

export async function listAccounts(orgId: string, includeArchived: boolean) {
  const rows = await listAccountsQuery(orgId, includeArchived);
  if (rows.length === 0) return [];
  const memberRows = await listAccountMemberDetails(rows.map((r) => r.id));
  // Map for O(1) grouping (js-perf skill rule — Map preferred over Record for repeated lookups)
  const byAccount = new Map<string, { id: string; displayName: string }[]>();
  for (const m of memberRows) {
    const list = byAccount.get(m.accountId) ?? [];
    list.push({ id: m.memberId, displayName: m.displayName });
    byAccount.set(m.accountId, list);
  }
  return rows.map((r) => ({ ...r, owners: byAccount.get(r.id) ?? [] }));
}

export async function createAccount(
  orgId: string,
  data: z.infer<typeof createAccountSchema>
) {
  const { memberIds = [], ...accountData } = data
  return db.transaction(async (tx) => {
    const row = await insertAccount(tx, orgId, accountData)
    await insertAccountMembers(tx, row.id, memberIds)
    return row
  })
}

export async function updateAccount(
  id: string,
  orgId: string,
  data: z.infer<typeof updateAccountSchema>
) {
  const { memberIds, archivedAt, ...updateData } = data
  const updated = await db.transaction(async (tx) => {
    const row = await updateAccountQuery(tx, id, orgId, updateData)
    if (!row) return null
    if (memberIds !== undefined) {
      await replaceAccountMembers(tx, id, memberIds)
    }
    return row
  })
  if (!updated) throw new NotFoundError('Account not found.')
  return updated
}

export async function getAccountMembers(id: string, orgId: string) {
  const account = await fetchAccountById(id, orgId)
  if (!account) throw new NotFoundError('Account not found.')
  return listAccountMembers(id)
}

export async function archiveAccountById(id: string, orgId: string) {
  const updated = await archiveAccount(id, orgId)
  if (!updated) throw new NotFoundError('Account not found.')
  return updated
}
