import { db } from '@ploutizo/db';
import { NORMALIZED_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import type {
  CreateImportDraftInput,
  UpdateImportDraftRowInput,
} from '@ploutizo/validators';
import { DomainError, NotFoundError } from '@/lib/errors';
import { computeImportRowStatus } from '@/lib/imports/rowStatus';
import {
  discardImportDraftQuery,
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftRowById,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listActiveImportDraftSummaries,
  listDraftRows,
  listImportTargetAccounts,
  listRecentImportHistory,
  touchImportDraft,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';
import { parsePloutizoNormalizedCsv } from '@/lib/imports/normalizedCsv';

const toImportDraftSummary = (
  row: Awaited<ReturnType<typeof listActiveImportDraftSummaries>>[number]
): ImportDraftSummary => {
  if (!row.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }
  return {
    ...row,
    accountId: row.accountId,
    importedAt: row.importedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    discardedAt: row.discardedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const toImportDraftRow = (
  row: Awaited<ReturnType<typeof listDraftRows>>[number]
): ImportDraftRow => ({
  ...row,
  parsedDate: row.parsedDate ?? null,
  reviewDate: row.reviewDate ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listImportTargets = async (
  orgId: string
): Promise<ImportTargetAccount[]> => listImportTargetAccounts(orgId);

export const listActiveImportDrafts = async (
  orgId: string
): Promise<ImportDraftSummary[]> => {
  const rows = await listActiveImportDraftSummaries(orgId);
  return rows.map(toImportDraftSummary);
};

export const listImportHistory = async (
  orgId: string
): Promise<ImportDraftSummary[]> => {
  const rows = await listRecentImportHistory(orgId);
  return rows.map(toImportDraftSummary);
};

export const getImportDraft = async (
  orgId: string,
  draftId: string
): Promise<ImportDraft> => {
  const summary = await fetchDraftSummaryById(orgId, draftId);
  if (!summary) throw new NotFoundError('Import draft not found.');
  const rows = await listDraftRows(orgId, draftId);
  return {
    ...toImportDraftSummary(summary),
    rows: rows.map(toImportDraftRow),
  };
};

export const createNormalizedImportDraft = async (
  orgId: string,
  input: CreateImportDraftInput
): Promise<{ draft: ImportDraft; reusedExisting: boolean }> => {
  const account = await fetchActiveCreditCardAccount(orgId, input.accountId);
  if (!account) {
    throw new NotFoundError('Import target account not found.');
  }

  const existingDraft = await fetchActiveDraftByAccount(orgId, input.accountId);
  if (existingDraft) {
    return {
      draft: await getImportDraft(orgId, existingDraft.id),
      reusedExisting: true,
    };
  }

  const parsed = parsePloutizoNormalizedCsv(input.content);
  const draftId = await db.transaction(async (tx) => {
    const batch = await insertImportBatch(tx, {
      orgId,
      accountId: input.accountId,
      source: parsed.source,
      status: 'draft',
      fileName: input.fileName,
      importedAt: new Date(),
      rowCount: parsed.rowCount,
      validRowCount: parsed.validRowCount,
      invalidRowCount: parsed.invalidRowCount,
    });

    await insertImportBatchRows(
      tx,
      parsed.rows.map((row) => ({
        ...row,
        orgId,
        batchId: batch.id,
      }))
    );

    return batch.id;
  });

  return { draft: await getImportDraft(orgId, draftId), reusedExisting: false };
};

export const discardImportDraft = async (orgId: string, draftId: string) => {
  const row = await discardImportDraftQuery(orgId, draftId);
  if (!row) throw new NotFoundError('Import draft not found.');
  return row;
};

export const updateImportDraftRow = async (
  orgId: string,
  rowId: string,
  input: UpdateImportDraftRowInput
): Promise<ImportDraftRow> => {
  const existing = await fetchDraftRowById(orgId, rowId);
  if (!existing) throw new NotFoundError('Import draft row not found.');

  const merged = { ...existing, ...input };
  const status = computeImportRowStatus({
    status: existing.status,
    reviewType: merged.reviewType ?? null,
    parsedType: merged.parsedType ?? null,
    reviewCategoryName: merged.reviewCategoryName ?? null,
  });

  const updated = await updateImportDraftRowQuery(orgId, rowId, {
    ...input,
    status,
  });
  if (!updated) throw new NotFoundError('Import draft row not found.');
  await touchImportDraft(orgId, existing.batchId);
  return toImportDraftRow(updated);
};

export const getNormalizedImportExampleCsv = () => NORMALIZED_IMPORT_EXAMPLE_CSV;
