import { db } from '@ploutizo/db';
import {
  accounts,
  importBatchRows,
  importBatches,
} from '@ploutizo/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

const IMPORT_SUMMARY_COLUMNS = {
  id: importBatches.id,
  accountId: importBatches.accountId,
  accountName: accounts.name,
  accountInstitution: accounts.institution,
  accountLastFour: accounts.lastFour,
  source: importBatches.source,
  status: importBatches.status,
  fileName: importBatches.fileName,
  rowCount: importBatches.rowCount,
  validRowCount: importBatches.validRowCount,
  invalidRowCount: importBatches.invalidRowCount,
  importedAt: importBatches.importedAt,
  completedAt: importBatches.completedAt,
  discardedAt: importBatches.discardedAt,
  createdAt: importBatches.createdAt,
  updatedAt: importBatches.updatedAt,
} as const;

export const listImportTargetAccounts = async (orgId: string) =>
  db
    .select({
      id: accounts.id,
      name: accounts.name,
      institution: accounts.institution,
      lastFour: accounts.lastFour,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.orgId, orgId),
        eq(accounts.type, 'credit_card'),
        isNull(accounts.archivedAt)
      )
    )
    .orderBy(accounts.name);

export const fetchActiveCreditCardAccount = async (
  orgId: string,
  accountId: string
) => {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.orgId, orgId),
        eq(accounts.type, 'credit_card'),
        isNull(accounts.archivedAt)
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

export const listActiveImportDraftSummaries = async (orgId: string) =>
  db
    .select(IMPORT_SUMMARY_COLUMNS)
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(and(eq(importBatches.orgId, orgId), eq(importBatches.status, 'draft')))
    .orderBy(desc(importBatches.updatedAt));

export const listRecentImportHistory = async (orgId: string, limit = 10) =>
  db
    .select(IMPORT_SUMMARY_COLUMNS)
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(
      and(
        eq(importBatches.orgId, orgId),
        sql`${importBatches.status} <> 'draft'`
      )
    )
    .orderBy(desc(importBatches.updatedAt))
    .limit(limit);

export const fetchActiveDraftByAccount = async (
  orgId: string,
  accountId: string
) => {
  const rows = await db
    .select(IMPORT_SUMMARY_COLUMNS)
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(
      and(
        eq(importBatches.orgId, orgId),
        eq(importBatches.accountId, accountId),
        eq(importBatches.status, 'draft')
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

export const fetchDraftSummaryById = async (orgId: string, draftId: string) => {
  const rows = await db
    .select(IMPORT_SUMMARY_COLUMNS)
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(
      and(
        eq(importBatches.orgId, orgId),
        eq(importBatches.id, draftId),
        eq(importBatches.status, 'draft')
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

export const listDraftRows = async (orgId: string, draftId: string) =>
  db
    .select()
    .from(importBatchRows)
    .where(and(eq(importBatchRows.orgId, orgId), eq(importBatchRows.batchId, draftId)))
    .orderBy(importBatchRows.rowNumber);

export const insertImportBatch = async (
  tx: DrizzleTransaction,
  values: typeof importBatches.$inferInsert
) => {
  const [row] = await tx.insert(importBatches).values(values).returning();
  return row;
};

export const insertImportBatchRows = async (
  tx: DrizzleTransaction,
  values: (typeof importBatchRows.$inferInsert)[]
) => {
  if (values.length === 0) return [];
  return tx.insert(importBatchRows).values(values).returning();
};

export const discardImportDraftQuery = async (orgId: string, draftId: string) => {
  const rows = await db
    .update(importBatches)
    .set({
      status: 'discarded',
      discardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importBatches.orgId, orgId),
        eq(importBatches.id, draftId),
        eq(importBatches.status, 'draft')
      )
    )
    .returning({ id: importBatches.id });
  return rows.at(0) ?? null;
};

export const fetchDraftRowForUpdate = async (orgId: string, rowId: string) => {
  const rows = await db
    .select({ id: importBatchRows.id, batchId: importBatchRows.batchId })
    .from(importBatchRows)
    .innerJoin(importBatches, eq(importBatches.id, importBatchRows.batchId))
    .where(
      and(
        eq(importBatchRows.id, rowId),
        eq(importBatchRows.orgId, orgId),
        eq(importBatches.orgId, orgId),
        eq(importBatches.status, 'draft')
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

export const updateImportDraftRowQuery = async (
  orgId: string,
  rowId: string,
  values: Partial<typeof importBatchRows.$inferInsert>
) => {
  const rows = await db
    .update(importBatchRows)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(importBatchRows.id, rowId), eq(importBatchRows.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
};

export const touchImportDraft = async (draftId: string) => {
  await db
    .update(importBatches)
    .set({ updatedAt: new Date() })
    .where(eq(importBatches.id, draftId));
};
