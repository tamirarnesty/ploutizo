import { db } from '@ploutizo/db';
import { NORMALIZED_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { createImportReferenceResolver } from '@ploutizo/utils';
import {
  deriveImportRowStatus,
  resolveImportRowReviewType,
  toImportRowStatusFields,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
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
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { DomainError, NotFoundError } from '@/lib/errors';
import { isUniqueViolation } from '@/lib/isUniqueViolation';
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
import { listCategories } from '@/lib/queries/categories';
import { listOrgMembers } from '@/lib/queries/households';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import { listTags } from '@/lib/queries/tags';
import { parsePloutizoNormalizedCsv } from '@/lib/imports/normalizedCsv';
import {
  buildImportDraftRows,
  buildImportDraftView,
} from '@/services/import-draft-view';

const toImportDraftSummary = (
  row: ImportDraftSummaryRow
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
  return buildImportDraftView(orgId, summary, rows, toImportDraftSummary);
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
                reviewCounterpartAccountId: null,
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

  const draft = await fetchDraftSummaryById(orgId, existing.batchId);
  if (!draft?.accountId) throw new NotFoundError('Import draft not found.');

  const merged = { ...existing, ...input };

  await assertOrgWriteReferences(orgId, {
    categoryId: merged.reviewCategoryId ?? null,
    tagIds: merged.reviewTagIds,
    memberIds: merged.reviewAssigneeMemberIds,
  });

  if (merged.reviewCounterpartAccountId) {
    const funding = await fetchAccountWriteReference(
      orgId,
      merged.reviewCounterpartAccountId
    );
    if (!funding) throw new NotFoundError('Account not found');

    const reviewType = resolveImportRowReviewType({
      reviewType: toImportTransactionType(merged.reviewType),
      parsedType: toImportTransactionType(merged.parsedType),
    });
    if (reviewType === 'settlement') {
      const card = await fetchAccountWriteReference(orgId, draft.accountId);
      if (!card) throw new NotFoundError('Account not found');
      const policy = validateTransactionAccountPolicy({
        type: 'settlement',
        account: card,
        counterpartAccount: funding,
      });
      if (!policy.valid) {
        throw new DomainError(
          400,
          policy.violations.map((v) => v.message).join(' '),
          'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
        );
      }
    }
  }

  if (merged.reviewRefundOf) {
    const ok = await transactionExistsInOrg(orgId, merged.reviewRefundOf);
    if (!ok) throw new NotFoundError('Transaction not found');
  }

  const updated = await updateImportDraftRowQuery(orgId, rowId, input);
  if (!updated) throw new NotFoundError('Import draft row not found.');

  const [derivedRow] = await buildImportDraftRows(orgId, draft.accountId, [
    updated,
  ]);
  return derivedRow;
};

export const updateImportDraftRowSelection = async (
  orgId: string,
  draftId: string,
  input: UpdateImportDraftRowSelectionInput
): Promise<ImportDraftRow[]> => {
  const draft = await fetchDraftSummaryById(orgId, draftId);
  if (!draft) throw new NotFoundError('Import draft not found.');
  if (!draft.accountId) throw new NotFoundError('Import draft not found.');

  const uniqueRowIds = [...new Set(input.rowIds)];
  const matchingRows = await listDraftRowIdsForDraft(
    orgId,
    draftId,
    uniqueRowIds
  );
  if (matchingRows.length !== uniqueRowIds.length) {
    throw new NotFoundError('Import draft row not found.');
  }

  await db.transaction(async (tx) => {
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
  });

  const allRows = await listDraftRows(orgId, draftId);
  return buildImportDraftRows(orgId, draft.accountId, allRows);
};

export const getNormalizedImportExampleCsv = () =>
  NORMALIZED_IMPORT_EXAMPLE_CSV;
