import { importTransactionLinks } from '@ploutizo/db/schema';
import type { Transaction } from '@ploutizo/db';
import type { ImportTransactionLinkOutcome } from '@ploutizo/types';

export type ImportTransactionLinkInsert = {
  orgId: string;
  batchId: string;
  batchRowId: string;
  transactionId: string;
  outcome: ImportTransactionLinkOutcome;
};

export const insertImportTransactionLinks = async (
  tx: Transaction,
  values: readonly ImportTransactionLinkInsert[]
) => {
  if (values.length === 0) return [];
  return tx
    .insert(importTransactionLinks)
    .values([...values])
    .returning();
};
