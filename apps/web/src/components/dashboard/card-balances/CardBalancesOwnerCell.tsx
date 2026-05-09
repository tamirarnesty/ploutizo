import { Text } from '@ploutizo/ui/components/text';
import type { SettlementMemberRow } from '@ploutizo/types';

type CardBalancesOwnerCellProps = {
  members: SettlementMemberRow[];
};

export const CardBalancesOwnerCell = ({
  members,
}: CardBalancesOwnerCellProps) => {
  const nonZero = members.filter((m) => m.balanceCents !== 0);

  if (nonZero.length === 0) {
    return (
      <Text variant="caption" className="text-muted-foreground">
        —
      </Text>
    );
  }

  if (nonZero.length === 1) {
    return (
      <Text as="span" variant="body-sm" className="min-w-0 truncate">
        {nonZero[0]?.member.name ?? '—'}
      </Text>
    );
  }

  return (
    <Text as="span" variant="body-sm" className="min-w-0 truncate">
      Shared
    </Text>
  );
};
