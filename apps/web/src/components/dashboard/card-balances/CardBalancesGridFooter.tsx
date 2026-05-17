import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { formatCurrency } from '@/lib/formatCurrency';

export type CardBalancesGridFooterProps = {
  balanceTotalCents: number;
};

export const CardBalancesGridFooter = ({
  balanceTotalCents,
}: CardBalancesGridFooterProps) => (
  <DataGridTableFootRow>
    <DataGridTableFootRowCell colSpan={2}>
      <Text variant="caption" className="text-muted-foreground">
        Total outstanding
      </Text>
    </DataGridTableFootRowCell>
    <DataGridTableFootRowCell className="text-end">
      <Text
        as="span"
        variant="caption"
        className={cn(
          'font-semibold tabular-nums',
          balanceTotalCents < 0 ? 'text-success' : 'text-foreground'
        )}
      >
        {formatCurrency(Math.abs(balanceTotalCents))}
      </Text>
    </DataGridTableFootRowCell>
    <DataGridTableFootRowCell colSpan={4} />
  </DataGridTableFootRow>
);
