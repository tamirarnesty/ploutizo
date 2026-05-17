import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { formatCurrency } from '@/lib/formatCurrency';

type CardBalancesBalanceCellProps = {
  totalBalanceCents: number;
};

/** Sketch `.money`: 16px / 700 tabular monetary column. */
export const CardBalancesBalanceCell = ({
  totalBalanceCents,
}: CardBalancesBalanceCellProps) => {
  const isCredit = totalBalanceCents < 0;

  return (
    <Text
      as="span"
      variant="body-sm"
      className={cn(
        'block text-right text-base font-bold whitespace-nowrap tabular-nums',
        isCredit ? 'text-success' : 'text-foreground'
      )}
    >
      {formatCurrency(Math.abs(totalBalanceCents))}
    </Text>
  );
};
