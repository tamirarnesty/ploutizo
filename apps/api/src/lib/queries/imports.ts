import { db } from '@ploutizo/db';
import { accounts, importBatchRows, importBatches } from '@ploutizo/db/schema';
import { and, desc, eq, exists, inArray, isNull, ne, sql } from 'drizzle-orm';

export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type DbClient = DrizzleTransaction | typeof db;

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
    .where(
      and(eq(importBatches.orgId, orgId), eq(importBatches.status, 'draft'))
    )
    .orderBy(desc(importBatches.updatedAt));

export const listRecentImportHistory = async (orgId: string, limit = 10) =>
  db
    .select(IMPORT_SUMMARY_COLUMNS)
    .from(importBatches)
    .innerJoin(accounts, eq(accounts.id, importBatches.accountId))
    .where(
      and(eq(importBatches.orgId, orgId), ne(importBatches.status, 'draft'))
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
    .where(
      and(
        eq(importBatchRows.orgId, orgId),
        eq(importBatchRows.batchId, draftId)
      )
    )
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

export const discardImportDraftQuery = async (
  orgId: string,
  draftId: string
) => {
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

export const fetchDraftRowById = async (orgId: string, rowId: string) => {
  const access = await fetchDraftRowForUpdate(orgId, rowId);
  if (!access) return null;
  const rows = await db
    .select()
    .from(importBatchRows)
    .where(and(eq(importBatchRows.id, rowId), eq(importBatchRows.orgId, orgId)))
    .limit(1);
  return rows.at(0) ?? null;
};

export const updateImportDraftRowQuery = async (
  orgId: string,
  rowId: string,
  values: Partial<typeof importBatchRows.$inferInsert>,
  client: DbClient = db
) => {
  const rows = await client
    .update(importBatchRows)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(importBatchRows.id, rowId),
        eq(importBatchRows.orgId, orgId),
        exists(
          db
            .select({ one: sql`1` })
            .from(importBatches)
            .where(
              and(
                eq(importBatches.id, importBatchRows.batchId),
                eq(importBatches.orgId, orgId),
                eq(importBatches.status, 'draft')
              )
            )
        )
      )
    )
    .returning();
  return rows.at(0) ?? null;
};

export const touchImportDraft = async (
  orgId: string,
  draftId: string,
  client: DbClient = db
) => {
  await client
    .update(importBatches)
    .set({ updatedAt: new Date() })
    .where(and(eq(importBatches.id, draftId), eq(importBatches.orgId, orgId)));
};

export const adjustImportDraftRowCounts = async (
  orgId: string,
  draftId: string,
  delta: { validRowCount: number; invalidRowCount: number },
  client: DbClient = db
) => {
  if (delta.validRowCount === 0 && delta.invalidRowCount === 0) {
    await touchImportDraft(orgId, draftId, client);
    return;
  }

  await client
    .update(importBatches)
    .set({
      validRowCount: sql`${importBatches.validRowCount} + ${delta.validRowCount}`,
      invalidRowCount: sql`${importBatches.invalidRowCount} + ${delta.invalidRowCount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(importBatches.id, draftId), eq(importBatches.orgId, orgId)));
};

const draftRowInActiveDraftCondition = (orgId: string) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.id, importBatchRows.batchId),
          eq(importBatches.orgId, orgId),
          eq(importBatches.status, 'draft')
        )
      )
  );

export const listDraftRowIdsForDraft = async (
  orgId: string,
  draftId: string,
  rowIds: string[]
) => {
  if (rowIds.length === 0) return [];
  return db
    .select({ id: importBatchRows.id })
    .from(importBatchRows)
    .where(
      and(
        eq(importBatchRows.orgId, orgId),
        eq(importBatchRows.batchId, draftId),
        inArray(importBatchRows.id, rowIds),
        draftRowInActiveDraftCondition(orgId)
      )
    );
};

export const updateImportDraftRowSelectionQuery = async (
  orgId: string,
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean,
  client: DbClient = db
) => {
  if (rowIds.length === 0) return [];
  return client
    .update(importBatchRows)
    .set({ selectedForImport, updatedAt: new Date() })
    .where(
      and(
        eq(importBatchRows.orgId, orgId),
        eq(importBatchRows.batchId, draftId),
        inArray(importBatchRows.id, rowIds),
        draftRowInActiveDraftCondition(orgId)
      )
    )
    .returning();
};
