import { toFinancialInstitutionId } from '@ploutizo/types';
import type {
  Account,
  AccountOwner,
  ImportTargetAccount,
} from '@ploutizo/types';
import type { accounts } from '@ploutizo/db/schema';
import { listAccountMemberDetails } from '@/lib/queries/accounts';

type AccountRow = typeof accounts.$inferSelect;

type AccountMemberDetailRow = {
  accountId: string;
  memberId: string;
  displayName: string;
  imageUrl: string | null;
};

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : value;

const mapAccountRow = (row: AccountRow, owners: AccountOwner[]): Account => ({
  id: row.id,
  orgId: row.orgId,
  name: row.name,
  type: row.type,
  institutionId: toFinancialInstitutionId(row.institutionId),
  lastFour: row.lastFour,
  statementDueDay: row.statementDueDay ?? null,
  archivedAt: row.archivedAt ? toIsoString(row.archivedAt) : null,
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
  owners,
});

const ownersByAccountIdFromMemberRows = (
  memberRows: AccountMemberDetailRow[]
) => {
  const ownersByAccountId = new Map<string, AccountOwner[]>();
  for (const member of memberRows) {
    const owners = ownersByAccountId.get(member.accountId) ?? [];
    owners.push({
      id: member.memberId,
      displayName: member.displayName,
      imageUrl: member.imageUrl ?? null,
    });
    ownersByAccountId.set(member.accountId, owners);
  }
  return ownersByAccountId;
};

const fetchOwnersByAccountId = async (orgId: string, accountIds: string[]) => {
  if (accountIds.length === 0) return new Map<string, AccountOwner[]>();
  const memberRows = await listAccountMemberDetails(orgId, accountIds);
  return ownersByAccountIdFromMemberRows(memberRows);
};

export const buildAccounts = async (
  orgId: string,
  rows: AccountRow[]
): Promise<Account[]> => {
  if (rows.length === 0) return [];
  const ownersByAccountId = await fetchOwnersByAccountId(
    orgId,
    rows.map((row) => row.id)
  );
  return rows.map((row) =>
    mapAccountRow(row, ownersByAccountId.get(row.id) ?? [])
  );
};

export const buildAccount = async (
  orgId: string,
  row: AccountRow
): Promise<Account> => {
  const ownersByAccountId = await fetchOwnersByAccountId(orgId, [row.id]);
  return mapAccountRow(row, ownersByAccountId.get(row.id) ?? []);
};

export const toImportTargetAccount = (row: {
  id: string;
  name: string;
  institutionId: string | null;
  lastFour: string | null;
}): ImportTargetAccount => ({
  id: row.id,
  name: row.name,
  institutionId: toFinancialInstitutionId(row.institutionId),
  lastFour: row.lastFour,
});
