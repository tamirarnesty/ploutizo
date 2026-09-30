import { lrmSplit } from '@ploutizo/utils/assignee-split';
import { createTransactionSchema } from '@ploutizo/validators';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';
import type {
  ImportRowSnapshot,
  ImportTransactionType,
  ReviewedImportValues,
} from '@ploutizo/types';
import type { CreateTransactionInput } from '@ploutizo/validators';
import type { ImportTransactionLinkInsert } from '@/lib/queries/import-transaction-links';
import type { TransactionCreate } from '@/services/transaction-create';
import { DomainError } from '@/lib/errors';

const requireImportType = (
  values: ReviewedImportValues
): ImportTransactionType => {
  if (
    values.type !== 'expense' &&
    values.type !== 'refund' &&
    values.type !== 'settlement'
  ) {
    throw new DomainError(500, 'Created import row is missing a type.');
  }
  return values.type;
};

/** Project a created import row snapshot onto the normal create contract. */
export const toImportCreateTransactionInput = (input: {
  accountId: string;
  batchId: string;
  snapshot: ImportRowSnapshot;
  refundOf: string | null;
}): CreateTransactionInput => {
  const { accountId, batchId, snapshot, refundOf } = input;
  const values = snapshot.reviewedValues;
  if (values.date == null || values.amount == null || !values.description) {
    throw new DomainError(
      500,
      'Created import row is missing required reviewed values.'
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
      'Created import row is missing required reviewed values.'
    );
  }
  return parsed.data;
};

export type PreparedImportCreates = {
  readonly items: readonly TransactionCreate[];
  readonly links: readonly ImportTransactionLinkInsert[];
};

/**
 * Projection to transaction creates plus created and matched links, built
 * from one row id to transaction id map. Verification already guaranteed
 * every same-batch refund target is finalizable.
 */
export const prepareImportTransactionCreates = (input: {
  orgId: string;
  draft: { id: string; accountId: string };
  projection: readonly ImportRowProjection[];
}): PreparedImportCreates => {
  const { orgId, draft, projection } = input;
  const transactionIdByRowId = new Map<string, string>();
  for (const row of projection) {
    if (row.outcome === 'matched' && row.transactionId) {
      transactionIdByRowId.set(row.batchRowId, row.transactionId);
    } else if (row.outcome === 'created') {
      transactionIdByRowId.set(row.batchRowId, crypto.randomUUID());
    }
  }

  const resolveRefundOf = (values: ReviewedImportValues): string | null => {
    if (values.refundOf) return values.refundOf;
    if (!values.refundOfBatchRowId) return null;
    const target = transactionIdByRowId.get(values.refundOfBatchRowId);
    if (!target) {
      throw new DomainError(
        500,
        'Created import refund is linked to a row that is not finalized.'
      );
    }
    return target;
  };

  const items: TransactionCreate[] = [];
  const links: ImportTransactionLinkInsert[] = [];
  for (const row of projection) {
    const transactionId = transactionIdByRowId.get(row.batchRowId);
    if (!transactionId) continue;
    if (row.outcome === 'created') {
      items.push({
        id: transactionId,
        input: toImportCreateTransactionInput({
          accountId: draft.accountId,
          batchId: draft.id,
          snapshot: row.snapshot,
          refundOf: resolveRefundOf(row.snapshot.reviewedValues),
        }),
      });
    }
    links.push({
      orgId,
      batchId: draft.id,
      batchRowId: row.batchRowId,
      transactionId,
      outcome: row.outcome === 'created' ? 'created' : 'matched',
    });
  }

  return { items, links };
};
