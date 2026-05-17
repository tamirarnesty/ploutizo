import { Text } from '@ploutizo/ui/components/text';
import { formatDueShort } from '@/components/dashboard/card-balances/formatDueShort';

type CardBalancesDueCellProps = {
  dueDate: string | null;
};

export const CardBalancesDueCell = ({ dueDate }: CardBalancesDueCellProps) => {
  if (!dueDate) {
    return (
      <span className="block min-h-[18px]" aria-hidden>
        {/* Intentionally empty — sketch: no dash when statement due is absent */}
      </span>
    );
  }

  return (
    <Text
      variant="body-sm"
      className="min-h-[18px] text-[13px] whitespace-nowrap text-muted-foreground tabular-nums"
    >
      {formatDueShort(dueDate)}
    </Text>
  );
};
