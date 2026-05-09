import { Text } from '@ploutizo/ui/components/text';
import { formatDueShort } from '@/components/dashboard/card-balances/formatDueShort';

type CardBalancesDueCellProps = {
  dueDate: string | null;
};

export const CardBalancesDueCell = ({ dueDate }: CardBalancesDueCellProps) => (
  <Text variant="body-sm" className="text-muted-foreground">
    {formatDueShort(dueDate)}
  </Text>
);
