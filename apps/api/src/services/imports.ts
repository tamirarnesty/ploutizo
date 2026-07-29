import { db } from '@ploutizo/db';
import { NORMALIZED_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { createImportReferenceResolver } from '@ploutizo/utils';
import { toImportTransactionType } from '@ploutizo/utils/import-row-status';
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
import type {
  ImportDraftRowRecord,
  ImportDraftSummaryRow,
} from '@/lib/queries/imports';
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
import { listAccountMembers } from '@/lib/queries/accounts';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import { listMerchantRulesForClassification } from '@/lib/queries/merchant-rules-classification';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import { listTags } from '@/lib/queries/tags';
import { parsePloutizoNormalizedCsv } from '@/lib/imports/normalizedCsv';
import {
  applyInitialImportClassification,
  applyRefundLinkInheritance,
  buildRefundLinkEvaluations,
  deriveTypeChangeSideEffects,
  resolveBillPaymentCategoryId,
  resolveReviewTypeFromRow,
} from '@/services/import-classification';
import { syncDraftRefundLinkStatuses } from '@/services/import-refund-sync';

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

const toImportDraftRow = (row: ImportDraftRowRecord): ImportDraftRow => ({
  ...row,
  parsedDate: row.parsedDate ?? null,
  reviewDate: row.reviewDate ?? null,
  parsedType: toImportTransactionType(row.parsedType),
  reviewType: toImportTransactionType(row.reviewType),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const collectRefundOfIds = (rows: readonly ImportDraftRowRecord[]): string[] =>
  rows.flatMap((row) => (row.reviewRefundOf ? [row.reviewRefundOf] : []));

const loadRefundEvaluationsForDraft = async (
  orgId: string,
  targetAccountId: string,
  draftRows: ImportDraftRowRecord[]
) => {
  const existingExpenses = await listRefundTargetExpensesByIds(
    orgId,
    collectRefundOfIds(draftRows)
  );
  return buildRefundLinkEvaluations(
    draftRows,
    targetAccountId,
    existingExpenses
  );
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
  if (!summary.accountId) throw new NotFoundError('Import draft not found.');

  const listed = await listDraftRows(orgId, draftId);
  const hasRefundLinks = listed.some(
    (row) => row.reviewRefundOf || row.reviewRefundOfBatchRowId
  );

  // Re-evaluate refund-link validity on load when links exist so Continue
  // reflects deleted / amount-changed targets without an intervening edit.
  const rows = hasRefundLinks
    ? await db.transaction(async (tx) =>
        syncDraftRefundLinkStatuses(orgId, draftId, summary.accountId!, tx)
      )
    : listed;

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
  const [orgMembers, orgCategories, orgTags, merchantRules, accountMembers] =
    await Promise.all([
      listOrgMembers(orgId),
      listCategories(orgId),
      listTags(orgId),
      listMerchantRulesForClassification(orgId),
      listAccountMembers(orgId, input.accountId),
    ]);
  const resolveImportReferences = createImportReferenceResolver({
    categories: orgCategories,
    tags: orgTags,
    members: orgMembers,
  });
  const classificationCatalogs = {
    merchantRules,
    billPaymentCategoryId: resolveBillPaymentCategoryId(orgCategories),
    accountOwnerMemberIds: accountMembers.map((member) => member.memberId),
  };

  try {
    const classifiedRows = parsed.rows.map((row) => {
      const { csvCategoryName, csvAssigneeName, csvTagNames, ...rowFields } =
        row;
      const resolvedRefs = resolveImportReferences({
        csvCategoryName,
        csvAssigneeName,
        csvTagNames,
      });
      const classified = applyInitialImportClassification(
        row,
        resolvedRefs,
        classificationCatalogs
      );

      return {
        ...rowFields,
        reviewType: classified.reviewType,
        reviewDescription: classified.reviewDescription,
        reviewCategoryId: classified.reviewCategoryId,
        reviewAssigneeMemberIds: classified.reviewAssigneeMemberIds,
        reviewTagIds: classified.reviewTagIds,
        reviewCounterpartAccountId: null,
        reviewRefundOf: null,
        reviewRefundOfBatchRowId: null,
        status: classified.status,
        invalidReason: classified.invalidReason,
        orgId,
      };
    });
    const invalidRowCount = classifiedRows.filter(
      (row) => row.status === 'invalid'
    ).length;

    const draftId = await db.transaction(async (tx) => {
      const batch = await insertImportBatch(tx, {
        orgId,
        accountId: input.accountId,
        source: parsed.source,
        status: 'draft',
        fileName: input.fileName,
        importedAt: new Date(),
        rowCount: classifiedRows.length,
        validRowCount: classifiedRows.length - invalidRowCount,
        invalidRowCount,
      });

      await insertImportBatchRows(
        tx,
        classifiedRows.map((row) => ({ ...row, batchId: batch.id }))
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
): Promise<{ row: ImportDraftRow; draftRows: ImportDraftRow[] }> => {
  const existing = await fetchDraftRowById(orgId, rowId);
  if (!existing) throw new NotFoundError('Import draft row not found.');

  const draft = await fetchDraftSummaryById(orgId, existing.batchId);
  if (!draft?.accountId) throw new NotFoundError('Import draft not found.');
  const targetAccountId = draft.accountId;

  let patch: UpdateImportDraftRowInput = { ...input };

  const previousType = resolveReviewTypeFromRow(existing);
  const nextType =
    patch.reviewType !== undefined
      ? toImportTransactionType(patch.reviewType)
      : previousType;

  if (
    patch.reviewType !== undefined &&
    nextType !== previousType &&
    previousType != null
  ) {
    const categories = await listCategories(orgId);
    const billPaymentCategoryId = resolveBillPaymentCategoryId(categories);
    patch = {
      ...deriveTypeChangeSideEffects(nextType, billPaymentCategoryId),
      ...patch,
      reviewType: patch.reviewType,
    };
  }

  if (patch.reviewRefundOf != null) {
    patch.reviewRefundOfBatchRowId = null;
  } else if (patch.reviewRefundOfBatchRowId != null) {
    patch.reviewRefundOf = null;
  }

  const merged = { ...existing, ...patch };

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

    if (nextType === 'settlement') {
      const card = await fetchAccountWriteReference(orgId, targetAccountId);
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

  if (merged.reviewRefundOfBatchRowId) {
    const target = await fetchDraftRowById(
      orgId,
      merged.reviewRefundOfBatchRowId
    );
    if (!target || target.batchId !== existing.batchId) {
      throw new NotFoundError('Import draft row not found.');
    }
  }

  if (
    patch.reviewRefundOf !== undefined ||
    patch.reviewRefundOfBatchRowId !== undefined
  ) {
    const needsInheritance =
      patch.reviewCategoryId === undefined ||
      patch.reviewAssigneeMemberIds === undefined;
    if (needsInheritance) {
      const draftRowsPreview = (
        await listDraftRows(orgId, existing.batchId)
      ).map((row) => (row.id === rowId ? { ...row, ...merged } : row));
      const evaluations = await loadRefundEvaluationsForDraft(
        orgId,
        targetAccountId,
        draftRowsPreview
      );
      patch = applyRefundLinkInheritance(patch, evaluations.get(rowId));
    }
  }

  const draftRows = await db.transaction(async (tx) => {
    const row = await updateImportDraftRowQuery(orgId, rowId, patch, tx);
    if (!row) return null;
    return syncDraftRefundLinkStatuses(
      orgId,
      existing.batchId,
      targetAccountId,
      tx
    );
  });
  if (!draftRows) throw new NotFoundError('Import draft row not found.');

  const mapped = draftRows.map(toImportDraftRow);
  const row = mapped.find((candidate) => candidate.id === rowId);
  if (!row) throw new NotFoundError('Import draft row not found.');
  return { row, draftRows: mapped };
};

export const updateImportDraftRowSelection = async (
  orgId: string,
  draftId: string,
  input: UpdateImportDraftRowSelectionInput
): Promise<ImportDraftRow[]> => {
  const draft = await fetchDraftSummaryById(orgId, draftId);
  if (!draft) throw new NotFoundError('Import draft not found.');
  if (!draft.accountId) throw new NotFoundError('Import draft not found.');
  const targetAccountId = draft.accountId;

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

    const synced = await syncDraftRefundLinkStatuses(
      orgId,
      draftId,
      targetAccountId,
      tx
    );
    await touchImportDraft(orgId, draftId, tx);
    return synced;
  });

  return updated.map(toImportDraftRow);
};

export const getNormalizedImportExampleCsv = () =>
  NORMALIZED_IMPORT_EXAMPLE_CSV;
