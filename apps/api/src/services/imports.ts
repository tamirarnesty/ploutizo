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
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { DomainError, NotFoundError } from '@/lib/errors';
import { isUniqueViolation } from '@/lib/isUniqueViolation';
import {
  discardImportDraftQuery,
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listActiveImportDraftSummaries,
  listAllDraftRowIdsForDraft,
  listDraftRows,
  listDraftRowsByIds,
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
  tx: Transaction,
  orgId: string,
  existing: ImportDraftRowRecord,
  draftRowIds: ReadonlySet<string>,
  draftAccountId: string,
  input: UpdateImportDraftRowInput
) => {
  const merged = { ...existing, ...input };

  await assertOrgWriteReferences(
    orgId,
    {
      categoryId: merged.reviewCategoryId ?? null,
      tagIds: merged.reviewTagIds,
      memberIds: merged.reviewAssigneeMemberIds,
    },
    tx
  );

  if (merged.reviewCounterpartAccountId) {
    const funding = await fetchAccountWriteReference(
      orgId,
      merged.reviewCounterpartAccountId,
      {},
      tx
    );
    if (!funding) throw new NotFoundError('Account not found');

    const { type } = resolveReviewedImportValues(merged);
    if (type === 'settlement') {
      const card = await fetchAccountWriteReference(
        orgId,
        draftAccountId,
        {},
        tx
      );
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
    const ok = await transactionExistsInOrg(orgId, merged.reviewRefundOf, tx);
    if (!ok) throw new NotFoundError('Transaction not found');
  }

  if (input.reviewMatchedTransactionId) {
    await requireMatchTargetOnDraftAccount(
      orgId,
      input.reviewMatchedTransactionId,
      draftAccountId,
      tx
    );
  }

  if (
    input.reviewRefundOfBatchRowId &&
    !draftRowIds.has(input.reviewRefundOfBatchRowId)
  ) {
    throw new NotFoundError('Import draft row not found.');
  }
};

/** Load, validate, write, and read refund facts under the draft lock so Continue/Finalize never interleave. */
export const updateImportDraftRows = async (
  orgId: string,
  draftId: string,
  input: BatchUpdateImportDraftRowsInput
): Promise<BatchUpdateImportDraftRowsResult> => {
  const uniqueIds = new Set(input.rows.map((row) => row.id));
  if (uniqueIds.size !== input.rows.length) {
    throw new DomainError(400, 'Duplicate row ids in batch update.');
  }

  return db.transaction(async (tx) => {
    await lockImportDraftBatch(tx, orgId, draftId);

    const draft = await fetchDraftSummaryById(orgId, draftId, tx);
    if (!draft?.accountId) throw new NotFoundError('Import draft not found.');

    const useTargetedLookup = input.rows.length <= 20;
    const existingRows = useTargetedLookup
      ? await listDraftRowsByIds(
          orgId,
          draftId,
          input.rows.map((row) => row.id),
          tx
        )
      : await listDraftRows(orgId, draftId, tx);
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    // Refund same-import targets must be validated against every row id on the draft.
    const draftRowIds = new Set(
      useTargetedLookup
        ? await listAllDraftRowIdsForDraft(orgId, draftId, tx)
        : existingRows.map((row) => row.id)
    );

    for (const { id, ...patch } of input.rows) {
      const existing = existingById.get(id);
      if (!existing) throw new NotFoundError('Import draft row not found.');
      await validateImportDraftRowPatch(
        tx,
        orgId,
        existing,
        draftRowIds,
        draft.accountId,
        patch
      );
    }

    const rows: ImportDraftPersistedRow[] = [];
    for (const { id, ...patch } of input.rows) {
      const next = await updateImportDraftRowQuery(orgId, id, patch, tx);
      if (!next) throw new NotFoundError('Import draft row not found.');
      rows.push(toImportDraftPersistedRow(next));
    }

    const refundOfIds = input.rows.flatMap((row) =>
      'reviewRefundOf' in row && row.reviewRefundOf ? [row.reviewRefundOf] : []
    );
    if (refundOfIds.length === 0) return { rows };

    const expenses = await listRefundTargetExpensesByIds(
      orgId,
      refundOfIds,
      tx
    );
    return {
      rows,
      refundTargetFacts: refundTargetFactsRecordFromMap(expenses),
    };
  });
};

export const getImportExampleCsv = () => INTERNAL_IMPORT_EXAMPLE_CSV;
