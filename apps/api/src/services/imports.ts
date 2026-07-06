import { db } from '@ploutizo/db';
import {
  IMPORT_TRANSACTION_TYPE_VALUES,
  NORMALIZED_IMPORT_EXAMPLE_CSV,
} from '@ploutizo/types';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTargetAccount,
  ImportTransactionType,
} from '@ploutizo/types';
import type {
  CreateImportDraftInput,
  UpdateImportDraftRowInput,
  UpdateImportDraftRowSelectionInput,
} from '@ploutizo/validators';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  computeImportRowStatus,
  isImportRowStructurallyInvalid,
} from '@/lib/imports/rowStatus';
import {
  discardImportDraftQuery,
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftRowById,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listActiveImportDraftSummaries,
  listDraftRowIdsForDraft,
  listDraftRows,
  listImportTargetAccounts,
  listRecentImportHistory,
  touchImportDraft,
  updateImportDraftRowQuery,
  updateImportDraftRowSelectionQuery,
} from '@/lib/queries/imports';
import { listOrgMembers } from '@/lib/queries/households';
import { parsePloutizoNormalizedCsv } from '@/lib/imports/normalizedCsv';

const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    if ('code' in current && (current as { code: string }).code === '23505') {
      return true;
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
};

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

const toImportTransactionType = (
  value: string | null | undefined
): ImportTransactionType | null => {
  if (!value) return null;
  return (IMPORT_TRANSACTION_TYPE_VALUES as readonly string[]).includes(value)
    ? (value as ImportTransactionType)
    : null;
};

const matchOrgMemberIdsByHint = (
  hint: string | null | undefined,
  orgMembers: Awaited<ReturnType<typeof listOrgMembers>>
): string[] => {
  if (!hint) return [];
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return [];

  const exact = orgMembers.find(
    (member) => member.displayName.trim().toLowerCase() === normalized
  );
  if (exact) return [exact.id];

  const partial = orgMembers.find((member) => {
    const displayName = member.displayName.trim().toLowerCase();
    return displayName.includes(normalized) || normalized.includes(displayName);
  });
  return partial ? [partial.id] : [];
};

const toImportDraftRow = (
  row: Awaited<ReturnType<typeof listDraftRows>>[number]
): ImportDraftRow => ({
  ...row,
  parsedDate: row.parsedDate ?? null,
  reviewDate: row.reviewDate ?? null,
  parsedType: toImportTransactionType(row.parsedType),
  reviewType: toImportTransactionType(row.reviewType),
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
  const orgMembers = await listOrgMembers(orgId);

  try {
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
        parsed.rows.map((row) => {
          const reviewAssigneeMemberIds = matchOrgMemberIdsByHint(
            row.reviewAssigneeHint,
            orgMembers
          );
          return {
            ...row,
            status:
              row.status === 'invalid'
                ? row.status
                : computeImportRowStatus({
                    status: row.status,
                    reviewType: toImportTransactionType(row.reviewType),
                    parsedType: toImportTransactionType(row.parsedType),
                    reviewCategoryName: row.reviewCategoryName,
                    reviewAssigneeMemberIds,
                  }),
            reviewAssigneeMemberIds,
            orgId,
            batchId: batch.id,
          };
        })
      );

      return batch.id;
    });

    return {
      draft: await getImportDraft(orgId, draftId),
      reusedExisting: false,
    };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const racedDraft = await fetchActiveDraftByAccount(orgId, input.accountId);
    if (!racedDraft) throw error;

    return {
      draft: await getImportDraft(orgId, racedDraft.id),
      reusedExisting: true,
    };
  }
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
  const reviewType = toImportTransactionType(merged.reviewType);
  const parsedType = toImportTransactionType(merged.parsedType);
  const structurallyInvalid = isImportRowStructurallyInvalid({
    reviewDate: merged.reviewDate ?? null,
    reviewAmount: merged.reviewAmount ?? null,
    reviewType,
    reviewDescription: merged.reviewDescription ?? null,
    parsedDate: merged.parsedDate ?? null,
    parsedAmount: merged.parsedAmount ?? null,
    parsedType,
    parsedDescription: merged.parsedDescription ?? null,
  });
  const status =
    existing.status === 'skipped'
      ? 'skipped'
      : structurallyInvalid
        ? 'invalid'
        : computeImportRowStatus({
            status: 'needs_review',
            reviewType,
            parsedType,
            reviewCategoryName: merged.reviewCategoryName ?? null,
            reviewAssigneeMemberIds: merged.reviewAssigneeMemberIds,
          });

  const updated = await updateImportDraftRowQuery(orgId, rowId, {
    ...input,
    status,
    ...(existing.status === 'invalid' && !structurallyInvalid
      ? { invalidReason: null }
      : {}),
  });
  if (!updated) throw new NotFoundError('Import draft row not found.');
  await touchImportDraft(orgId, existing.batchId);
  return toImportDraftRow(updated);
};

export const updateImportDraftRowSelection = async (
  orgId: string,
  draftId: string,
  input: UpdateImportDraftRowSelectionInput
): Promise<ImportDraftRow[]> => {
  const draft = await fetchDraftSummaryById(orgId, draftId);
  if (!draft) throw new NotFoundError('Import draft not found.');

  const uniqueRowIds = [...new Set(input.rowIds)];
  const matchingRows = await listDraftRowIdsForDraft(
    orgId,
    draftId,
    uniqueRowIds
  );
  if (matchingRows.length !== uniqueRowIds.length) {
    throw new NotFoundError('Import draft row not found.');
  }

  const updated = await db.transaction(async (tx) => {
    const rows = await updateImportDraftRowSelectionQuery(
      orgId,
      draftId,
      uniqueRowIds,
      input.selectedForImport,
      tx
    );
    if (rows.length !== uniqueRowIds.length) {
      throw new NotFoundError('Import draft row not found.');
    }
    await touchImportDraft(orgId, draftId, tx);
    return rows;
  });

  return updated.map(toImportDraftRow);
};

export const getNormalizedImportExampleCsv = () =>
  NORMALIZED_IMPORT_EXAMPLE_CSV;
