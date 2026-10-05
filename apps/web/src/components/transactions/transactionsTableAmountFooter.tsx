import {
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { TransactionRow } from '@ploutizo/validators';
import { formatSignedAmountCents } from './transactionRowDisplay';
import type { Table } from '@tanstack/react-table';

export const buildTransactionsAmountFooter = (
  table: Table<TransactionRow>,
  pageAmountSumCents: number
) => {
  const columns = table.getVisibleLeafColumns();
  const amountIndex = columns.findIndex((column) => column.id === 'amount');
  if (amountIndex < 0) return null;

  const { displayValue, colorClass } =
    formatSignedAmountCents(pageAmountSumCents);
  const trailingSpan = columns.length - amountIndex - 1;

  return (
    <DataGridTableFootRow>
      {amountIndex > 0 ? (
        <DataGridTableFootRowCell colSpan={amountIndex} />
      ) : null}
      <DataGridTableFootRowCell className="text-right tabular-nums">
        <Text
          as="span"
          variant="body-sm"
          className={cn('font-semibold', colorClass)}
        >
          {displayValue}
        </Text>
      </DataGridTableFootRowCell>
      {trailingSpan > 0 ? (
        <DataGridTableFootRowCell colSpan={trailingSpan} />
      ) : null}
    </DataGridTableFootRow>
  );
};
