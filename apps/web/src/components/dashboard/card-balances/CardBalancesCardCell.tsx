import { Text } from '@ploutizo/ui/components/text';
import type { SettlementAccountRow } from '@ploutizo/types';

type CardBalancesCardCellProps = {
  account: SettlementAccountRow['account'];
};

export const CardBalancesCardCell = ({
  account,
}: CardBalancesCardCellProps) => (
  <div className="flex min-w-0 items-center gap-2">
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold uppercase"
      aria-hidden="true"
    >
      {account.name.slice(0, 2)}
    </div>
    <Text
      as="span"
      variant="body-sm"
      className="min-w-0 truncate font-semibold"
    >
      {account.name}
    </Text>
  </div>
);
