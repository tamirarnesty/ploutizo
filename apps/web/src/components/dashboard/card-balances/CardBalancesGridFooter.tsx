import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { RightAlignedCell } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import { formatCurrency, formatSignedBalanceCents } from '@/lib/formatCurrency';

export type CardBalancesGridFooterProps = {
  balanceTotalCents: number;
};

export const CardBalancesGridFooter = ({
  balanceTotalCents,
}: CardBalancesGridFooterProps) => {
  const display = formatSignedBalanceCents(balanceTotalCents);

  return (
    <DataGridTableFootRow>
      <DataGridTableFootRowCell colSpan={2}>
        <Text variant="caption">Total outstanding</Text>
      </DataGridTableFootRowCell>
      <DataGridTableFootRowCell>
        <RightAlignedCell>
          <Text
            as="span"
            className={cn(
              'text-sm font-semibold whitespace-nowrap tabular-nums',
              display.tone === 'credit' && 'text-success',
              display.tone === 'zero' && 'text-muted-foreground',
              display.tone === 'owed' && 'text-foreground'
            )}
          >
            {formatCurrency(Math.abs(balanceTotalCents))}
          </Text>
        </RightAlignedCell>
      </DataGridTableFootRowCell>
      <DataGridTableFootRowCell colSpan={4} />
    </DataGridTableFootRow>
  );
};
