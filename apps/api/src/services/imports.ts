import { db } from '@ploutizo/db';
import { INTERNAL_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { classifyImportRows } from '@ploutizo/utils/classify-import-rows';
import {
  resolveImportRowReviewType,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
import type {
  ImportDraft,
  ImportDraftPersistedRow,
  ImportDraftSummary,
  ImportTargetAccount,
  UpdateImportDraftRowResult,
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
  listDraftRowsForBatches,
  listImportTargetAccounts,
  listRecentImportHistory,
  touchImportDraft,
  updateImportDraftRowQuery,
  updateImportDraftRowSelectionQuery,
} from '@/lib/queries/imports';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import { listCategories } from '@/lib/queries/categories';
import { listOrgMembers } from '@/lib/queries/households';
import { listMerchantRulesWithTags } from '@/lib/queries/merchant-rules';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import { listTags } from '@/lib/queries/tags';
import { parseImportUpload } from '@/lib/imports/parse';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import {
  buildImportDraftView,
  loadDraftRefundContext,
  refundTargetFactsRecordFromMap,
  toImportDraftPersistedRow,
  withLiveImportReviewCounts,
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
    // History omits live review counts until PLO-56 records completed results.
    validRowCount: 0,
    invalidRowCount: 0,
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
  const summaries = await listActiveImportDraftSummaries(orgId);
  if (summaries.length === 0) return [];

  const rows = await listDraftRowsForBatches(
    orgId,
    summaries.map((summary) => summary.id)
  );
  const rowsByBatch = new Map<string, typeof rows>();
  for (const row of rows) {
    const batchRows = rowsByBatch.get(row.batchId) ?? [];
    batchRows.push(row);
    rowsByBatch.set(row.batchId, batchRows);
  }

  return Promise.all(
    summaries.map(async (summary) => {
      if (!summary.accountId) {
        throw new DomainError(500, 'Import draft is missing an account.');
      }
      const batchRows = rowsByBatch.get(summary.id) ?? [];
      const { evaluations } = await loadDraftRefundContext(
        orgId,
        summary.accountId,
        batchRows
      );
      return withLiveImportReviewCounts(
        toImportDraftSummary(summary),
        evaluations
      );
    })
  );
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

export const createImportDraft = async (
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

  const parsed = parseImportUpload(input.content, {
    fileName: input.fileName,
  });
  const [orgMembers, orgCategories, orgTags, merchantRules, accountOwners] =
    await Promise.all([
      listOrgMembers(orgId),
      listCategories(orgId),
      listTags(orgId),
      listMerchantRulesWithTags(orgId),
      listAccountMemberDetails(orgId, [input.accountId]),
    ]);
  const classifiedRows = classifyImportRows(parsed.rows, {
    catalogs: {
      categories: orgCategories,
      tags: orgTags,
      members: orgMembers,
    },
    merchantRules,
    accountOwnerMemberIds: accountOwners.map((owner) => owner.memberId),
  });

  try {
    const draftId = await db.transaction(async (tx) => {
      const batch = await insertImportBatch(tx, {
        orgId,
        accountId: input.accountId,
        source: parsed.format,
        status: 'draft',
        fileName: input.fileName,
        importedAt: new Date(),
        rowCount: parsed.rowCount,
      });

      await insertImportBatchRows(
        tx,
        parsed.rows.map((row, index) => {
          const {
            csvCategoryName: _csvCategoryName,
            csvAssigneeName: _csvAssigneeName,
            csvTagNames: _csvTagNames,
            ...rowFields
          } = row;

          return {
            ...rowFields,
            ...classifiedRows[index],
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
): Promise<UpdateImportDraftRowResult> => {
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

  const row = toImportDraftPersistedRow(updated);

  let refundTargetFacts: UpdateImportDraftRowResult['refundTargetFacts'];
  if (Object.prototype.hasOwnProperty.call(input, 'reviewRefundOf')) {
    const refundOf = input.reviewRefundOf;
    if (refundOf) {
      const expenses = await listRefundTargetExpensesByIds(orgId, [refundOf]);
      refundTargetFacts = refundTargetFactsRecordFromMap(expenses);
    }
  }

  return refundTargetFacts ? { row, refundTargetFacts } : { row };
};

export const updateImportDraftRowSelection = async (
  orgId: string,
  draftId: string,
  input: UpdateImportDraftRowSelectionInput
): Promise<ImportDraftPersistedRow[]> => {
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

  let persistedRows: Awaited<
    ReturnType<typeof updateImportDraftRowSelectionQuery>
  > = [];

  await db.transaction(async (tx) => {
    persistedRows = await updateImportDraftRowSelectionQuery(
      orgId,
      draftId,
      uniqueRowIds,
      input.selectedForImport,
      tx
    );
    if (persistedRows.length !== uniqueRowIds.length) {
      throw new NotFoundError('Import draft row not found.');
    }
    await touchImportDraft(orgId, draftId, tx);
  });

  return persistedRows.map(toImportDraftPersistedRow);
};

export const getImportExampleCsv = () => INTERNAL_IMPORT_EXAMPLE_CSV;
