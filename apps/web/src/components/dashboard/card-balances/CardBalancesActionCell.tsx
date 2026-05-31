import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { Button } from '@ploutizo/ui/components/button';
import { cn } from '@ploutizo/ui/lib/utils';
import { WalletCards } from 'lucide-react';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { SettlePayTowardMenuItem } from '@/components/dashboard/card-balances/SettlePayTowardMenuItem';

type CardBalancesActionCellProps = {
  account: SettlementAccountRow;
  onSettleClick: CardBalancesSettleClickHandler;
};

const sortMembersForMenu = (account: SettlementAccountRow) =>
  [...account.members].sort((a, b) => a.member.id.localeCompare(b.member.id));

export const CardBalancesActionCell = ({
  account,
  onSettleClick,
}: CardBalancesActionCellProps) => {
  const menuMembers = sortMembersForMenu(account);

  return (
    <div
      className={cn(
        'flex justify-end',
        'opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
        'motion-reduce:opacity-100',
        'group-focus-within/row:opacity-100 group-hover/row:opacity-100',
        '[&:has([data-slot="dropdown-menu-trigger"][data-popup-open])]:opacity-100',
        '[&:has(button[aria-expanded="true"])]:opacity-100'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Settle ${account.account.name}`}
              aria-haspopup="menu"
            >
              <WalletCards className="size-4 shrink-0" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Pay toward
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {menuMembers.map((m) => (
              <SettlePayTowardMenuItem
                key={m.member.id}
                label={m.member.name}
                balanceCents={m.personalBalanceCents}
                onSelect={() => onSettleClick(account, m.member.id)}
              />
            ))}
            <SettlePayTowardMenuItem
              label="Shared"
              balanceCents={account.sharedBalanceCents}
              onSelect={() => onSettleClick(account, 'shared')}
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
