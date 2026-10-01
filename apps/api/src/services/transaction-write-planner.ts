/**
 * Write-time checks and payload shaping for transaction create/update.
 *
 * Owns type-specific scalar nulling, counterpart / refundOf org guards, and
 * DomainError mapping for split-sum, account policy, archived-date, and
 * external-id conflicts. Split math and validateSplitSum live in
 * `@ploutizo/utils/assignee-split`.
 */
import {
  normalizeTransactionAssignees,
  validateSplitSum,
} from '@ploutizo/utils/assignee-split';
import {
  validateArchivedAccountAvailability,
  validateTransactionAccountPolicy,
} from '@ploutizo/utils/transaction-policy';
import type { Transaction } from '@ploutizo/db';
import type { TransactionType } from '@ploutizo/types';
import type {
  CreateTransactionInput,
  UpdateTransactionServiceInput,
} from '@ploutizo/validators';
import type { AccountWriteReference } from '@/lib/queries/scope';
import { DomainError } from '@/lib/errors';
import { isExternalIdUniqueViolation } from '@/lib/isUniqueViolation';
import {
  counterpartAccountBelongsToOrg,
  refundOfExists,
} from '@/lib/queries/transactions';

export type TransactionWriteAccounts = {
  account: AccountWriteReference;
  counterpartAccount: AccountWriteReference | null;
};

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

export const invalidCounterpartAccountError = () =>
  new DomainError(
    400,
    'counterpartAccountId references an account not in this household',
    'INVALID_COUNTERPART_ACCOUNT'
  );

export const invalidRefundReferenceError = () =>
  new DomainError(
    400,
    'refundOf transaction not found in this household',
    'INVALID_REFUND_REFERENCE'
  );

export const assertTransactionAccountPolicy = (
  type: TransactionType,
  accounts: TransactionWriteAccounts
) => {
  const result = validateTransactionAccountPolicy({
    type,
    account: accounts.account,
    counterpartAccount: accounts.counterpartAccount,
  });

  if (!result.valid) {
    throw new DomainError(
      400,
      result.violations.map((violation) => violation.message).join(' '),
      'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
    );
  }
};

export const assertArchivedAccountAvailability = (
  date: string,
  accounts: TransactionWriteAccounts
) => {
  const result = validateArchivedAccountAvailability({
    date,
    account: accounts.account,
    counterpartAccount: accounts.counterpartAccount,
  });

  if (!result.valid) {
    throw new DomainError(
      400,
      result.violations.map((violation) => violation.message).join(' '),
      'ARCHIVED_ACCOUNT_DATE'
    );
  }
};

/** Maps the active external-id unique index violation to 409 EXTERNAL_ID_CONFLICT. */
export const runTransactionWrite = async <T>(
  write: () => Promise<T>
): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    if (isExternalIdUniqueViolation(error)) {
      throw new DomainError(
        409,
        'An active transaction with this external id already exists on this account.',
        'EXTERNAL_ID_CONFLICT'
      );
    }
    throw error;
  }
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
    if (!valid) throw invalidCounterpartAccountError();
  }

  if ('refundOf' in data && data.refundOf) {
    const owned = await refundOfExists(orgId, data.refundOf, tx);
    if (!owned) throw invalidRefundReferenceError();
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
