/**
 * Write-time checks and payload shaping for transaction create/update.
 *
 * Owns type-specific scalar nulling, counterpart / refundOf org guards, and
 * DomainError mapping for split-sum failures. Split math and validateSplitSum
 * live in `@ploutizo/utils/assignee-split`.
 */
import {
  normalizeTransactionAssignees,
  validateSplitSum,
} from '@ploutizo/utils/assignee-split';
import type { Transaction } from '@ploutizo/db';
import type { TransactionType } from '@ploutizo/types';
import type {
  CreateTransactionInput,
  UpdateTransactionServiceInput,
} from '@ploutizo/validators';
import { DomainError } from '@/lib/errors';
import {
  counterpartAccountBelongsToOrg,
  refundOfExists,
} from '@/lib/queries/transactions';

const COUNTERPART_ACCOUNT_TYPES: ReadonlySet<TransactionType> = new Set([
  'transfer',
  'settlement',
  'contribution',
]);

const CATEGORY_TYPES: ReadonlySet<TransactionType> = new Set([
  'expense',
  'refund',
  'settlement',
]);

export type SplitAssigneeRow = { amountCents: number };

export const assigneeRowsForPatchSplitSum = (
  payloadAssignees: CreateTransactionInput['assignees'] | undefined,
  existingAssignees: readonly SplitAssigneeRow[]
): SplitAssigneeRow[] | null => {
  const rows =
    payloadAssignees !== undefined
      ? payloadAssignees.map((a) => ({ amountCents: a.amountCents }))
      : existingAssignees.map((a) => ({ amountCents: a.amountCents }));
  return rows.length > 0 ? rows : null;
};

export const typeSpecificNullsForWrite = (
  type: TransactionType
): Record<string, null> => {
  const typeSpecificNulls: Record<string, null> = {};
  if (!COUNTERPART_ACCOUNT_TYPES.has(type)) {
    typeSpecificNulls.counterpartAccountId = null;
  }
  if (type !== 'refund') {
    typeSpecificNulls.refundOf = null;
  }
  if (type !== 'income') {
    typeSpecificNulls.incomeType = null;
  }
  // Expense/refund require category; settlement may keep Bill Payment readability.
  if (!CATEGORY_TYPES.has(type)) {
    typeSpecificNulls.categoryId = null;
  }
  return typeSpecificNulls;
};

export const assertSplitSum = (
  amount: number,
  assignees?: SplitAssigneeRow[]
): void => {
  const splitError = validateSplitSum(amount, assignees);
  if (splitError) throw new DomainError(400, splitError, 'BAD_REQUEST');
};

export const assertTransactionWriteOrgRefs = async (
  orgId: string,
  data: CreateTransactionInput | UpdateTransactionServiceInput,
  tx?: Transaction
): Promise<void> => {
  if ('counterpartAccountId' in data && data.counterpartAccountId) {
    const valid = await counterpartAccountBelongsToOrg(
      orgId,
      data.counterpartAccountId,
      tx
    );
    if (!valid) {
      throw new DomainError(
        400,
        'counterpartAccountId references an account not in this org',
        'INVALID_COUNTERPART_ACCOUNT'
      );
    }
  }

  if ('refundOf' in data && data.refundOf) {
    const owned = await refundOfExists(orgId, data.refundOf, tx);
    if (!owned) {
      throw new DomainError(
        400,
        'refundOf transaction not found in this org',
        'INVALID_REFUND_REFERENCE'
      );
    }
  }
};

export const planCreateTransactionWrite = (data: CreateTransactionInput) => {
  const { assignees, tagIds, ...transactionData } = data;
  assertSplitSum(transactionData.amount, assignees);
  return {
    transactionData,
    tagIds,
    normalizedAssignees: normalizeTransactionAssignees(
      transactionData.amount,
      assignees
    ),
  };
};

export const planUpdateTransactionWrite = (
  data: UpdateTransactionServiceInput,
  existingAssignees: readonly SplitAssigneeRow[]
) => {
  const { assignees, tagIds, ...updateData } = data;
  Object.assign(updateData, typeSpecificNullsForWrite(data.type));

  const rowsForSplitCheck = assigneeRowsForPatchSplitSum(
    data.assignees,
    existingAssignees
  );
  if (rowsForSplitCheck) {
    assertSplitSum(data.amount, rowsForSplitCheck);
  }

  const normalizedAssignees =
    assignees !== undefined
      ? normalizeTransactionAssignees(data.amount, assignees)
      : undefined;

  return { updateData, tagIds, normalizedAssignees };
};
