import { db } from '@ploutizo/db';
import { NORMALIZED_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { createImportReferenceResolver } from '@ploutizo/utils';
import {
  deriveImportRowStatus,
  toImportRowStatusFields,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import type {
  CreateImportDraftInput,
  UpdateImportDraftRowInput,
  UpdateImportDraftRowSelectionInput,
} from '@ploutizo/validators';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  adjustImportDraftRowCounts,
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
import { listCategories } from '@/lib/queries/categories';
import { listOrgMembers } from '@/lib/queries/households';
import { listTags } from '@/lib/queries/tags';
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
  const {
    accountId,
    accountName,
    accountInstitution,
    accountLastFour,
    importedAt,
    completedAt,
    discardedAt,
    createdAt,
    updatedAt,
    ...summary
  } = row;
  return {
    ...summary,
    account: {
      id: accountId,
      name: accountName,
      institution: accountInstitution,
      lastFour: accountLastFour,
    },
    importedAt: importedAt.toISOString(),
    completedAt: completedAt?.toISOString() ?? null,
    discardedAt: discardedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
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
  const [orgMembers, orgCategories, orgTags] = await Promise.all([
    listOrgMembers(orgId),
    listCategories(orgId),
    listTags(orgId),
  ]);
  const resolveImportReferences = createImportReferenceResolver({
    categories: orgCategories,
    tags: orgTags,
    members: orgMembers,
  });

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
          const {
            csvCategoryName,
            csvAssigneeName,
            csvTagNames,
            ...rowFields
          } = row;
          const resolvedRefs = resolveImportReferences({
            csvCategoryName,
            csvAssigneeName,
            csvTagNames,
          });

          return {
            ...rowFields,
            ...resolvedRefs,
            status: deriveImportRowStatus(
              toImportRowStatusFields({
                status: row.status,
                reviewDate: row.reviewDate ?? null,
                reviewAmount: row.reviewAmount ?? null,
                reviewType: toImportTransactionType(row.reviewType),
                reviewDescription: row.reviewDescription ?? null,
                parsedDate: row.parsedDate ?? null,
                parsedAmount: row.parsedAmount ?? null,
                parsedType: toImportTransactionType(row.parsedType),
                parsedDescription: row.parsedDescription ?? null,
                reviewCategoryId: resolvedRefs.reviewCategoryId,
                reviewAssigneeMemberIds: resolvedRefs.reviewAssigneeMemberIds,
              })
            ),
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

  await assertOrgWriteReferences(orgId, {
    categoryId: merged.reviewCategoryId ?? null,
    tagIds: merged.reviewTagIds,
    memberIds: merged.reviewAssigneeMemberIds,
  });

  const status = deriveImportRowStatus(
    toImportRowStatusFields({
      status: existing.status,
      reviewDate: merged.reviewDate ?? null,
      reviewAmount: merged.reviewAmount ?? null,
      reviewType: toImportTransactionType(merged.reviewType),
      reviewDescription: merged.reviewDescription ?? null,
      parsedDate: merged.parsedDate ?? null,
      parsedAmount: merged.parsedAmount ?? null,
      parsedType: toImportTransactionType(merged.parsedType),
      parsedDescription: merged.parsedDescription ?? null,
      reviewCategoryId: merged.reviewCategoryId ?? null,
      reviewAssigneeMemberIds: merged.reviewAssigneeMemberIds,
    })
  );

  const wasInvalid = existing.status === 'invalid';
  const isInvalid = status === 'invalid';
  const countDelta =
    wasInvalid && !isInvalid
      ? { validRowCount: 1, invalidRowCount: -1 }
      : !wasInvalid && isInvalid
        ? { validRowCount: -1, invalidRowCount: 1 }
        : { validRowCount: 0, invalidRowCount: 0 };

  const updated = await db.transaction(async (tx) => {
    const row = await updateImportDraftRowQuery(
      orgId,
      rowId,
      {
        ...input,
        status,
        ...(existing.status === 'invalid' && !isInvalid
          ? { invalidReason: null }
          : {}),
      },
      tx
    );
    if (!row) return null;
    await adjustImportDraftRowCounts(orgId, existing.batchId, countDelta, tx);
    return row;
  });
  if (!updated) throw new NotFoundError('Import draft row not found.');
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
