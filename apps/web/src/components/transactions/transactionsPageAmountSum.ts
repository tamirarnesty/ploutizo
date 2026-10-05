import type { TransactionRow } from '@ploutizo/validators';
import { signedAmountCentsForColumn } from './transactionRowDisplay';

export const sumLoadedPageAmountCents = (
  rows: Pick<TransactionRow, 'type' | 'amount'>[]
): number =>
  rows.reduce((sum, row) => sum + signedAmountCentsForColumn(row), 0);
