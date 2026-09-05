import { db } from '@ploutizo/db';
import {
  INTERNAL_IMPORT_EXAMPLE_CSV,
  isImportContentProfileId,
  toFinancialInstitutionId,
} from '@ploutizo/types';
import {
  collectMatchedTransactionIds,
  createImportRowClassifier,
  evaluateImportMatches,
  matchDecisionForSelectionChange,
  toImportMatchDraftRow,
} from '@ploutizo/utils';
import {
  resolveImportRowReviewType,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
import type {
  CreateImportDraftResponse,
  ImportContentProfileId,
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
import { toImportTargetAccount } from '@/lib/accounts/accountResponse';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import { listImportMatchTargets } from '@/lib/queries/import-match-targets';
import {
  buildImportDraftView,
  loadDraftEvaluationContext,
  refundTargetFactsRecordFromMap,
  toImportDraftPersistedRow,
  withLiveImportReviewCounts,
} from '@/services/import-draft-view';

const toContentProfileId = (
  contentProfileId: string | null
): ImportContentProfileId | null => {
  if (contentProfileId == null) return null;
  // Fail closed when persisted IDs drift from IMPORT_CONTENT_PROFILE_IDS.
  if (!isImportContentProfileId(contentProfileId)) {
    throw new DomainError(500, 'Import draft has an unknown content profile.');
  }
  return contentProfileId;
};

const toImportDraftSummary = (
  row: ImportDraftSummaryRow
): ImportDraftSummary => {
  if (!row.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }
  const {
    accountId,
    accountName,
    accountInstitutionId,
    accountLastFour,
    contentProfileId,
    importedAt,
    completedAt,
    discardedAt,
    createdAt,
    updatedAt,
    ...summary
  } = row;
  const accountInstitution = toFinancialInstitutionId(accountInstitutionId);
  return {
    ...summary,
    contentProfileId: toContentProfileId(contentProfileId),
    // History omits live review counts until PLO-56 records completed results.
    validRowCount: 0,
    invalidRowCount: 0,
    account: {
      id: accountId,
      name: accountName,
      institutionId: accountInstitution,
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
): Promise<ImportTargetAccount[]> => {
  const rows = await listImportTargetAccounts(orgId);
  return rows.map(toImportTargetAccount);
};

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
      const { evaluations } = await loadDraftEvaluationContext(
        orgId,
        summary.accountId,
        batchRows,
        { includeMatchTargets: false }
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
): Promise<CreateImportDraftResponse> => {
  const account = await fetchActiveCreditCardAccount(orgId, input.accountId);
  if (!account) {
    throw new NotFoundError('Import target account not found.');
  }

  const existingDraft = await fetchActiveDraftByAccount(orgId, input.accountId);
  if (existingDraft) {
    return {
      kind: 'draft',
      data: await getImportDraft(orgId, existingDraft.id),
      meta: { reusedExisting: true },
    };
  }

  const parsed = parseImportUpload(input.content, input.selection);
  if (parsed.kind === 'mapping_required') {
    return parsed;
  }
  const [orgMembers, orgCategories, orgTags, merchantRules, accountOwners] =
    await Promise.all([
      listOrgMembers(orgId),
      listCategories(orgId),
      listTags(orgId),
      listMerchantRulesWithTags(orgId),
      listAccountMemberDetails(orgId, [input.accountId]),
    ]);
  const classificationContext = {
    catalogs: {
      categories: orgCategories,
      tags: orgTags,
      members: orgMembers,
    },
    merchantRules,
    accountOwnerMemberIds: accountOwners.map((owner) => owner.memberId),
  };
  const classifyRow = createImportRowClassifier(classificationContext);

  try {
    const draftId = await db.transaction(async (tx) => {
      const batch = await insertImportBatch(tx, {
        orgId,
        accountId: input.accountId,
        contentProfileId: parsed.contentProfileId,
        status: 'draft',
        fileName: input.fileName,
        importedAt: new Date(),
        rowCount: parsed.rowCount,
      });

      await insertImportBatchRows(
        tx,
        parsed.rows.map((row) => {
          const {
            csvCategoryName: _csvCategoryName,
            csvAssigneeName: _csvAssigneeName,
            csvTagNames: _csvTagNames,
            classificationHint: _classificationHint,
            ...rowFields
          } = row;

          return {
            ...rowFields,
            ...classifyRow(row),
            orgId,
            batchId: batch.id,
          };
        })
      );

      return batch.id;
    });

    return {
      kind: 'draft',
      data: await getImportDraft(orgId, draftId),
      meta: { reusedExisting: false },
    };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const racedDraft = await fetchActiveDraftByAccount(orgId, input.accountId);
    if (!racedDraft) throw error;

    return {
      kind: 'draft',
      data: await getImportDraft(orgId, racedDraft.id),
      meta: { reusedExisting: true },
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

  if (merged.reviewMatchedTransactionId) {
    const ok = await transactionExistsInOrg(
      orgId,
      merged.reviewMatchedTransactionId
    );
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
  const accountId = draft.accountId;
  if (!accountId) throw new NotFoundError('Import draft not found.');

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

    const draftRows = await listDraftRows(orgId, draftId, tx);
    const existingTransactions = await listImportMatchTargets(
      orgId,
      accountId,
      collectMatchedTransactionIds(draftRows),
      tx
    );
    const matchEvaluations = evaluateImportMatches(
      draftRows.map((row) => toImportMatchDraftRow(row)),
      {
        targetAccountId: accountId,
        existingTransactions: [...existingTransactions.values()],
      }
    );

    const nextPersisted = [...persistedRows];
    for (const [index, persisted] of persistedRows.entries()) {
      const nextMatchedTransactionId = matchDecisionForSelectionChange({
        selectedForImport: input.selectedForImport,
        currentMatchedTransactionId: persisted.reviewMatchedTransactionId,
        exactCandidate:
          matchEvaluations.get(persisted.id)?.exactCandidate ?? null,
      });
      if (nextMatchedTransactionId === persisted.reviewMatchedTransactionId) {
        continue;
      }
      const updated = await updateImportDraftRowQuery(
        orgId,
        persisted.id,
        { reviewMatchedTransactionId: nextMatchedTransactionId },
        tx
      );
      if (updated) nextPersisted[index] = updated;
    }
    persistedRows = nextPersisted;

    await touchImportDraft(orgId, draftId, tx);
  });

  return persistedRows.map(toImportDraftPersistedRow);
};

export const getImportExampleCsv = () => INTERNAL_IMPORT_EXAMPLE_CSV;
