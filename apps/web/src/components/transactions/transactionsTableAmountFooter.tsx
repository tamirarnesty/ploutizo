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
  netCents: number
) => {
  const columns = table.getVisibleLeafColumns();
  const amountIndex = columns.findIndex((column) => column.id === 'amount');
  if (amountIndex < 0) return null;

  const { displayValue, colorClass } = formatSignedAmountCents(netCents);
  const trailingSpan = columns.length - amountIndex - 1;

  const totalLabel = (
    <Text
      as="span"
      variant="label"
      className="font-semibold whitespace-nowrap text-foreground"
    >
      Page net
    </Text>
  );

  return (
    <DataGridTableFootRow>
      {amountIndex > 0 ? (
        <DataGridTableFootRowCell colSpan={amountIndex} className="text-left">
          {totalLabel}
        </DataGridTableFootRowCell>
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
