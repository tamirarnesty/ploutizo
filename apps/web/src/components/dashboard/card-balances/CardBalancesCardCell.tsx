import { Avatar, AvatarFallback } from '@ploutizo/ui/components/avatar';
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import type { SettlementAccountRow } from '@ploutizo/types';

type CardBalancesCardCellProps = {
  account: SettlementAccountRow['account'];
};

/** Item composes avatar + title; neutral hover in grid cells (row hover is primary). */
export const CardBalancesCardCell = ({
  account,
}: CardBalancesCardCellProps) => (
  <Item
    variant="default"
    size="xs"
    className="min-w-0 flex-nowrap border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
  >
    <ItemMedia variant="default" className="shrink-0">
      <Avatar className="size-7 rounded-sm after:rounded-sm" aria-hidden>
        <AvatarFallback className="rounded-sm bg-muted text-xs font-semibold uppercase">
          {account.name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
    </ItemMedia>
    <ItemContent className="min-w-0">
      <ItemTitle className="truncate text-sm font-semibold">
        {account.name}
      </ItemTitle>
    </ItemContent>
  </Item>
);
