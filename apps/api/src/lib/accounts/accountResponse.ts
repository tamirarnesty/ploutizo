import { toFinancialInstitutionId } from '@ploutizo/types';
import type {
  Account,
  AccountOwner,
  ImportTargetAccount,
} from '@ploutizo/types';
import type { accounts } from '@ploutizo/db/schema';

type AccountRow = typeof accounts.$inferSelect;

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : value;

export const toAccountResponse = (
  row: AccountRow,
  owners: AccountOwner[] = []
): Account => ({
  id: row.id,
  orgId: row.orgId,
  name: row.name,
  type: row.type,
  institutionId: toFinancialInstitutionId(row.institutionId),
  lastFour: row.lastFour,
  archivedAt: row.archivedAt ? toIsoString(row.archivedAt) : null,
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
  owners,
});

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
