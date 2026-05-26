import { db } from '@ploutizo/db';
import type {
  createAccountSchema,
  updateAccountSchema,
} from '@ploutizo/validators';
import type { z } from 'zod';
import { NotFoundError } from '@/lib/errors';
import { allMembersInOrg } from '@/lib/queries/scope';
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
} from '@/lib/queries/accounts';

const assertMembersInOrg = async (orgId: string, memberIds: string[]) => {
  if (memberIds.length === 0) return;
  const ok = await allMembersInOrg(orgId, memberIds);
  if (!ok) throw new NotFoundError('Member not found in this household');
};

export const listAccounts = async (orgId: string, includeArchived: boolean) => {
  const rows = await listAccountsQuery(orgId, includeArchived);
  if (rows.length === 0) return [];
  const memberRows = await listAccountMemberDetails(
    orgId,
    rows.map((r) => r.id)
  );
  const byAccount = new Map<
    string,
    { id: string; displayName: string; imageUrl: string | null }[]
  >();
  for (const m of memberRows) {
    const list = byAccount.get(m.accountId) ?? [];
    list.push({
      id: m.memberId,
      displayName: m.displayName,
      imageUrl: m.imageUrl ?? null,
    });
    byAccount.set(m.accountId, list);
  }
  return rows.map((r) => ({ ...r, owners: byAccount.get(r.id) ?? [] }));
};

export const createAccount = async (
  orgId: string,
  data: z.infer<typeof createAccountSchema>
) => {
  const { memberIds = [], ...accountData } = data;
  await assertMembersInOrg(orgId, memberIds);
  return db.transaction(async (tx) => {
    const row = await insertAccount(tx, orgId, accountData);
    await insertAccountMembers(tx, row.id, memberIds);
    return row;
  });
};

export const updateAccount = async (
  orgId: string,
  id: string,
  data: z.infer<typeof updateAccountSchema>
) => {
  const { memberIds, archivedAt, ...updateData } = data;
  if (memberIds !== undefined) {
    await assertMembersInOrg(orgId, memberIds);
  }
  const updated = await db.transaction(async (tx) => {
    const row = await updateAccountQuery(tx, orgId, id, updateData);
    if (!row) return null;
    if (memberIds !== undefined) {
      await replaceAccountMembers(tx, id, memberIds);
    }
    return row;
  });
  if (!updated) throw new NotFoundError('Account not found.');
  return updated;
};

export const getAccountMembers = async (orgId: string, accountId: string) => {
  const rows = await listAccountMembers(orgId, accountId);
  if (rows.length === 0) {
    const account = await fetchAccountById(orgId, accountId);
    if (!account) throw new NotFoundError('Account not found.');
  }
  return rows;
};

export const archiveAccountById = async (orgId: string, id: string) => {
  const updated = await archiveAccount(orgId, id);
  if (!updated) throw new NotFoundError('Account not found.');
  return updated;
};
