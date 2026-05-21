import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { formatSignedBalanceCents } from '@/lib/formatCurrency';

type CardBalancesBalanceCellProps = {
  totalBalanceCents: number;
};

export const CardBalancesBalanceCell = ({
  totalBalanceCents,
}: CardBalancesBalanceCellProps) => {
  const display = formatSignedBalanceCents(totalBalanceCents);

  return (
    <Text
      as="span"
      className={cn(
        'text-sm font-semibold whitespace-nowrap tabular-nums',
        display.tone === 'credit' && 'text-success',
        display.tone === 'zero' && 'text-muted-foreground',
        display.tone === 'owed' && 'text-foreground'
      )}
    >
      {display.text}
    </Text>
  );
};
