import { db } from '@ploutizo/db';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import { normalizeTransactionAssignees } from '@ploutizo/utils';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
import type { TransactionType } from '@ploutizo/types';
import type {
  CreateTransactionInput,
  UpdateTransactionServiceInput,
  createTransactionSchema,
} from '@ploutizo/validators';
import type { AccountWriteReference } from '@/lib/queries/scope';
import type { ListQueryParams } from '@/lib/queries/transactions';
import type { z } from 'zod';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  allMembersInOrg,
  allTagsInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import {
  buildListQuery,
  countQuery,
  counterpartAccountBelongsToOrg,
  enrichTransactions,
  fetchTransactionById,
  refundOfExists,
  replaceAssignees,
  replaceTags,
  restoreTransactionQuery,
  softDeleteTransactionQuery,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';

export type { ListQueryParams };

export const validateSplitSum = (
  amount: number,
  assignees?: { amountCents: number }[]
): string | null => {
  if (!assignees || assignees.length === 0) return null;
  const sum = assignees.reduce((acc, a) => acc + a.amountCents, 0);
  return sum === amount
    ? null
    : 'Assignee amounts must sum to transaction amount';
};

export const assigneeRowsForPatchSplitSum = (
  payloadAssignees: CreateTransactionInput['assignees'] | undefined,
  existingAssignees: readonly { amountCents: number }[]
): { amountCents: number }[] | null => {
  const rows =
    payloadAssignees !== undefined
      ? payloadAssignees.map((a) => ({ amountCents: a.amountCents }))
      : existingAssignees.map((a) => ({ amountCents: a.amountCents }));
  return rows.length > 0 ? rows : null;
};

export const checkRefundOfOwnership = async (
  orgId: string,
  refundOfId: string
): Promise<boolean> => refundOfExists(orgId, refundOfId);

export const checkCounterpartAccountOwnership = async (
  orgId: string,
  accountId: string
): Promise<boolean> => counterpartAccountBelongsToOrg(orgId, accountId);

type LoadedTransactionWriteReferences = {
  account: AccountWriteReference;
  counterpartAccount: AccountWriteReference | null;
};

const loadTransactionWriteReferences = async (
  orgId: string,
  data: {
    accountId: string;
    counterpartAccountId?: string | null;
    refundOf?: string | null;
    categoryId?: string | null;
    tagIds?: string[];
    assignees?: { memberId: string }[];
  }
): Promise<LoadedTransactionWriteReferences> => {
  const account = await fetchAccountWriteReference(orgId, data.accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  let counterpartAccount: AccountWriteReference | null = null;
  if (data.counterpartAccountId) {
    counterpartAccount = await fetchAccountWriteReference(
      orgId,
      data.counterpartAccountId
    );
    if (!counterpartAccount) {
      throw new NotFoundError('Account not found');
    }
  }

  if (data.refundOf) {
    if (!(await transactionExistsInOrg(orgId, data.refundOf))) {
      throw new NotFoundError('Transaction not found');
    }
  }

  if (data.categoryId) {
    if (!(await categoryExistsInOrg(orgId, data.categoryId))) {
      throw new NotFoundError('Category not found');
    }
  }

  if (data.tagIds && data.tagIds.length > 0) {
    if (!(await allTagsInOrg(orgId, data.tagIds))) {
      throw new NotFoundError('Tag not found');
    }
  }

  if (data.assignees && data.assignees.length > 0) {
    const memberIds = data.assignees.map((a) => a.memberId);
    if (!(await allMembersInOrg(orgId, memberIds))) {
      throw new NotFoundError('Member not found in this household');
    }
  }

  return { account, counterpartAccount };
};

const assertTransactionAccountPolicy = (
  type: TransactionType,
  refs: LoadedTransactionWriteReferences
) => {
  const result = validateTransactionAccountPolicy({
    type,
    account: refs.account,
    counterpartAccount: refs.counterpartAccount,
  });

  if (!result.valid) {
    throw new DomainError(
      400,
      result.violations.map((violation) => violation.message).join(' '),
      'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
    );
  }
};

export const createTransaction = async (
  orgId: string,
  data: z.infer<typeof createTransactionSchema>
) => {
  const { assignees, tagIds, ...transactionData } = data;

  const splitError = validateSplitSum(transactionData.amount, assignees);
  if (splitError) throw new Error(splitError);

  const normalizedAssignees = normalizeTransactionAssignees(
    transactionData.amount,
    assignees
  );

  const writeReferences = await loadTransactionWriteReferences(orgId, {
    accountId: transactionData.accountId,
    counterpartAccountId:
      'counterpartAccountId' in transactionData
        ? transactionData.counterpartAccountId
        : undefined,
    refundOf:
      'refundOf' in transactionData ? transactionData.refundOf : undefined,
    categoryId:
      'categoryId' in transactionData
        ? transactionData.categoryId
        : undefined,
    tagIds,
    assignees: normalizedAssignees,
  });
  assertTransactionAccountPolicy(transactionData.type, writeReferences);

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(transactions)
      .values({ orgId, ...transactionData })
      .returning();

    await tx.insert(transactionAssignees).values(
      normalizedAssignees.map((a) => ({
        transactionId: inserted.id,
        memberId: a.memberId,
        amountCents: a.amountCents,
        percentage: a.percentage.toString(),
      }))
    );

    if (tagIds && tagIds.length > 0) {
      await tx
        .insert(transactionTags)
        .values(tagIds.map((tagId) => ({ transactionId: inserted.id, tagId })));
    }

    return inserted;
  });
};

export const listTransactions = async (params: ListQueryParams) => {
  const [baseRows, total] = await Promise.all([
    buildListQuery(params),
    countQuery(params),
  ]);
  const { assigneeMap, tagMap } = await enrichTransactions(
    params.orgId,
    baseRows
  );
  const data = baseRows.map((row) => ({
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  }));
  return { data, total, page: params.page, limit: params.limit };
};

export const getTransaction = async (orgId: string, id: string) => {
  const row = await fetchTransactionById(orgId, id);
  if (!row) return null;
  const { assigneeMap, tagMap } = await enrichTransactions(orgId, [row]);
  return {
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  };
};

export const updateTransaction = async (
  orgId: string,
  id: string,
  data: UpdateTransactionServiceInput
) => {
  const { assignees, tagIds, ...updateData } = data;

  const typeSpecificNulls: Record<string, null> = {};
  if (!['transfer', 'settlement', 'contribution'].includes(data.type)) {
    typeSpecificNulls.counterpartAccountId = null;
  }
  if (data.type !== 'refund') {
    typeSpecificNulls.refundOf = null;
  }
  if (data.type !== 'income') {
    typeSpecificNulls.incomeType = null;
  }
  if (!['expense', 'refund'].includes(data.type)) {
    typeSpecificNulls.categoryId = null;
  }
  Object.assign(updateData, typeSpecificNulls);

  return db.transaction(async (tx) => {
    const row = await fetchTransactionById(orgId, id, tx);
    if (!row) return null;

    const writeReferences = await loadTransactionWriteReferences(orgId, {
      accountId: data.accountId,
      counterpartAccountId:
        'counterpartAccountId' in data ? data.counterpartAccountId : undefined,
      refundOf: 'refundOf' in data ? data.refundOf : undefined,
      categoryId: 'categoryId' in data ? data.categoryId : undefined,
      tagIds,
      assignees,
    });
    assertTransactionAccountPolicy(data.type, writeReferences);

    const needsPersistedAssignees = data.assignees === undefined;

    let existingAssignees: readonly { amountCents: number }[] = [];
    if (needsPersistedAssignees) {
      const { assigneeMap } = await enrichTransactions(orgId, [row], tx);
      existingAssignees = (assigneeMap[row.id] ??
        []) as readonly { amountCents: number }[];
    }

    const rowsForSplitCheck = assigneeRowsForPatchSplitSum(
      data.assignees,
      existingAssignees
    );
    if (rowsForSplitCheck) {
      const splitError = validateSplitSum(data.amount, rowsForSplitCheck);
      if (splitError) throw new Error(splitError);
    }

    const updated = await updateTransactionScalarsQuery(
      tx,
      orgId,
      id,
      updateData as Record<string, unknown>
    );

    if (!updated) return null;

    if (assignees !== undefined) {
      const normalizedAssignees = normalizeTransactionAssignees(
        data.amount,
        assignees
      );
      await replaceAssignees(tx, id, normalizedAssignees);
    }

    if (tagIds !== undefined) {
      await replaceTags(tx, id, tagIds);
    }

    return updated;
  });
};

export const deleteTransaction = async (
  orgId: string,
  id: string
): Promise<{ id: string } | null> => softDeleteTransactionQuery(orgId, id);

export const restoreTransaction = async (
  orgId: string,
  id: string
): Promise<{ id: string } | null> => restoreTransactionQuery(orgId, id);
