import { lrmSplit } from '@ploutizo/utils/assignee-split';
import { createTransactionSchema } from '@ploutizo/validators';
import type {
  ImportTransactionType,
  PreparedImportRowSnapshot,
  ReviewedImportValues,
} from '@ploutizo/types';
import type { CreateTransactionInput } from '@ploutizo/validators';
import type { ImportPreparedOutcomeRecord } from '@/lib/queries/import-prepared-sets';
import { DomainError } from '@/lib/errors';

export const IMPORT_TYPE_CREATE_ORDER: Record<ImportTransactionType, number> = {
  expense: 0,
  settlement: 1,
  refund: 2,
};

const requireImportType = (
  values: ReviewedImportValues
): ImportTransactionType => {
  if (
    values.type !== 'expense' &&
    values.type !== 'refund' &&
    values.type !== 'settlement'
  ) {
    throw new DomainError(500, 'Prepared create outcome is missing a type.');
  }
  return values.type;
};

/** Project a prepared create-outcome snapshot onto the normal create contract. */
export const toImportCreateTransactionInput = (input: {
  accountId: string;
  batchId: string;
  snapshot: PreparedImportRowSnapshot;
  refundOf: string | null;
}): CreateTransactionInput => {
  const { accountId, batchId, snapshot, refundOf } = input;
  const values = snapshot.reviewedValues;
  if (values.date == null || values.amount == null || !values.description) {
    throw new DomainError(
      500,
      'Prepared create outcome is missing required reviewed values.'
    );
  }

  const base = {
    accountId,
    amount: values.amount,
    date: values.date,
    description: values.description,
    notes: values.notes ?? undefined,
    assignees: lrmSplit(values.amount, values.assigneeMemberIds),
    tagIds: values.tagIds.length > 0 ? values.tagIds : undefined,
    importBatchId: batchId,
    rawDescription: snapshot.provenance.rawDescription,
    externalId: snapshot.provenance.externalId,
  };

  const type = requireImportType(values);
  const projected =
    type === 'expense'
      ? { ...base, type, categoryId: values.categoryId }
      : type === 'refund'
        ? {
            ...base,
            type,
            categoryId: values.categoryId,
            ...(refundOf ? { refundOf } : {}),
          }
        : {
            ...base,
            type,
            ...(values.counterpartAccountId
              ? { counterpartAccountId: values.counterpartAccountId }
              : {}),
            ...(values.categoryId ? { categoryId: values.categoryId } : {}),
          };

  const parsed = createTransactionSchema.safeParse(projected);
  if (!parsed.success) {
    throw new DomainError(
      500,
      'Prepared create outcome is missing required reviewed values.'
    );
  }
  return parsed.data;
};

export const sortCreatedImportOutcomes = (
  outcomes: ImportPreparedOutcomeRecord[]
) =>
  [...outcomes].sort((left, right) => {
    const order =
      IMPORT_TYPE_CREATE_ORDER[
        requireImportType(left.snapshot.reviewedValues)
      ] -
      IMPORT_TYPE_CREATE_ORDER[
        requireImportType(right.snapshot.reviewedValues)
      ];
    if (order !== 0) return order;
    return left.batchRowId.localeCompare(right.batchRowId);
  });
