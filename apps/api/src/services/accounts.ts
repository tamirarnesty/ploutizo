import { db } from '@ploutizo/db';
import {
  OWNERS_REQUIRED_MESSAGE,
  mergeAccountInstitutionViolation,
  mergeAccountStatementDueDay,
} from '@ploutizo/validators';
import type {
  createAccountSchema,
  updateAccountSchema,
} from '@ploutizo/validators';
import type { z } from 'zod';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  buildAccount,
  buildAccountFromMemberRows,
  buildAccounts,
} from '@/lib/accounts/accountResponse';
import { allMembersInOrg } from '@/lib/queries/scope';
import {
  archiveAccount,
  fetchAccountRecord,
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

const assertAccountHasOwners = async (orgId: string, accountId: string) => {
  const members = await listAccountMembers(orgId, accountId);
  if (members.length === 0) {
    throw new DomainError(400, OWNERS_REQUIRED_MESSAGE, 'VALIDATION_ERROR');
  }
};

export const listAccounts = async (orgId: string, includeArchived: boolean) => {
  const rows = await listAccountsQuery(orgId, includeArchived);
  return buildAccounts(orgId, rows);
};

export const createAccount = async (
  orgId: string,
  data: z.infer<typeof createAccountSchema>
) => {
  const { memberIds, ...accountData } = data;
  await assertMembersInOrg(orgId, memberIds);
  return db.transaction(async (tx) => {
    const inserted = await insertAccount(tx, orgId, accountData);
    await insertAccountMembers(tx, inserted.id, memberIds);
    const memberRows = await listAccountMemberDetails(orgId, [inserted.id], tx);
    return buildAccountFromMemberRows(inserted, memberRows);
  });
};

export const updateAccount = async (
  orgId: string,
  id: string,
  data: z.infer<typeof updateAccountSchema>
) => {
  const existing = await fetchAccountRecord(orgId, id);
  if (!existing) throw new NotFoundError('Account not found.');

  const { memberIds, archivedAt: _archivedAt, ...updateData } = data;
  const message = mergeAccountInstitutionViolation(existing, updateData);
  if (message) {
    throw new DomainError(400, message, 'VALIDATION_ERROR');
  }

  const statementDueDay = mergeAccountStatementDueDay(existing, updateData);
  const accountPatch = {
    ...updateData,
    ...(statementDueDay !== undefined ? { statementDueDay } : {}),
  };

  if (memberIds !== undefined) {
    await assertMembersInOrg(orgId, memberIds);
  } else {
    await assertAccountHasOwners(orgId, id);
  }
  const updated = await db.transaction(async (tx) => {
    const row = await updateAccountQuery(tx, orgId, id, accountPatch);
    if (!row) return null;
    if (memberIds !== undefined) {
      await replaceAccountMembers(tx, id, memberIds);
    }
    const memberRows = await listAccountMemberDetails(orgId, [row.id], tx);
    return buildAccountFromMemberRows(row, memberRows);
  });
  if (!updated) throw new NotFoundError('Account not found.');
  return updated;
};

export const getAccountMembers = async (orgId: string, accountId: string) => {
  const rows = await listAccountMembers(orgId, accountId);
  if (rows.length === 0) {
    const account = await fetchAccountRecord(orgId, accountId);
    if (!account) throw new NotFoundError('Account not found.');
  }
  return rows;
};

export const archiveAccountById = async (orgId: string, id: string) => {
  const updated = await archiveAccount(orgId, id);
  if (!updated) throw new NotFoundError('Account not found.');
  return buildAccount(orgId, updated);
};
