import { db } from '@ploutizo/db';
import { INTERNAL_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { createImportRowClassifier } from '@ploutizo/utils';
import { resolveReviewedImportValues } from '@ploutizo/utils/reviewed-import-values';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
import type { Transaction } from '@ploutizo/db';
import type {
  BatchUpdateImportDraftRowsResult,
  CreateImportDraftResponse,
  ImportDraft,
  ImportDraftPersistedRow,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import type {
  BatchUpdateImportDraftRowsInput,
  CreateImportDraftInput,
  UpdateImportDraftRowInput,
} from '@ploutizo/validators';
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
  listDraftRows,
  listDraftRowsForBatches,
  listImportTargetAccounts,
  lockImportDraftBatch,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import { listCategories } from '@/lib/queries/categories';
import { listOrgMembers } from '@/lib/queries/households';
import { listMerchantRulesWithTags } from '@/lib/queries/merchant-rules';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
  transactionExistsOnAccount,
} from '@/lib/queries/scope';
import { listTags } from '@/lib/queries/tags';
import { parseImportUpload } from '@/lib/imports/parse';
import { toImportTargetAccount } from '@/lib/accounts/accountResponse';
import { toImportDraftSummary } from '@/services/import-batch-mappers';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import {
  buildImportDraftView,
  loadDraftEvaluationContext,
  refundTargetFactsRecordFromMap,
  toImportDraftPersistedRow,
  withLiveImportReviewCounts,
} from '@/services/import-draft-view';

const requireMatchTargetOnDraftAccount = async (
  orgId: string,
  transactionId: string,
  accountId: string,
  tx?: Transaction
) => {
  const ok = await transactionExistsOnAccount(
    orgId,
    transactionId,
    accountId,
    tx
  );
  if (!ok) throw new NotFoundError('Transaction not found');
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
        batchRows
      );
      return withLiveImportReviewCounts(
        toImportDraftSummary(summary),
        evaluations
      );
    })
  );
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

const validateImportDraftRowPatch = async (
  orgId: string,
  existing: NonNullable<Awaited<ReturnType<typeof fetchDraftRowById>>>,
  draftAccountId: string,
  input: UpdateImportDraftRowInput
) => {
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

    const { type } = resolveReviewedImportValues(merged);
    if (type === 'settlement') {
      const card = await fetchAccountWriteReference(orgId, draftAccountId);
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

  if (input.reviewMatchedTransactionId) {
    await requireMatchTargetOnDraftAccount(
      orgId,
      input.reviewMatchedTransactionId,
      draftAccountId
    );
  }

  if (input.reviewRefundOfBatchRowId) {
    const target = await fetchDraftRowById(
      orgId,
      input.reviewRefundOfBatchRowId
    );
    if (!target || target.batchId !== existing.batchId) {
      throw new NotFoundError('Import draft row not found.');
    }
  }
};

export const updateImportDraftRows = async (
  orgId: string,
  draftId: string,
  input: BatchUpdateImportDraftRowsInput
): Promise<BatchUpdateImportDraftRowsResult> => {
  const draft = await fetchDraftSummaryById(orgId, draftId);
  if (!draft) throw new NotFoundError('Import draft not found.');
  if (!draft.accountId) throw new NotFoundError('Import draft not found.');

  const uniqueIds = [...new Set(input.rows.map((row) => row.id))];
  if (uniqueIds.length !== input.rows.length) {
    throw new DomainError(400, 'Duplicate row ids in batch update.');
  }

  const existingRows = await listDraftRows(orgId, draftId);
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  for (const rowId of uniqueIds) {
    if (!existingById.has(rowId)) {
      throw new NotFoundError('Import draft row not found.');
    }
  }

  for (const { id, ...patch } of input.rows) {
    const existing = existingById.get(id)!;
    await validateImportDraftRowPatch(orgId, existing, draft.accountId, patch);
    existingById.set(id, { ...existing, ...patch });
  }

  const refundOfIds = input.rows.flatMap((row) =>
    Object.prototype.hasOwnProperty.call(row, 'reviewRefundOf') &&
    row.reviewRefundOf
      ? [row.reviewRefundOf]
      : []
  );

  const updated = await db.transaction(async (tx) => {
    await lockImportDraftBatch(tx, orgId, draftId);
    const persisted: ImportDraftPersistedRow[] = [];
    for (const { id, ...patch } of input.rows) {
      const next = await updateImportDraftRowQuery(orgId, id, patch, tx);
      if (!next) throw new NotFoundError('Import draft row not found.');
      persisted.push(toImportDraftPersistedRow(next));
    }
    return persisted;
  });

  let refundTargetFacts: BatchUpdateImportDraftRowsResult['refundTargetFacts'];
  if (refundOfIds.length > 0) {
    const expenses = await listRefundTargetExpensesByIds(orgId, refundOfIds);
    refundTargetFacts = refundTargetFactsRecordFromMap(expenses);
  }

  return refundTargetFacts
    ? { rows: updated, refundTargetFacts }
    : { rows: updated };
};

export const getImportExampleCsv = () => INTERNAL_IMPORT_EXAMPLE_CSV;
