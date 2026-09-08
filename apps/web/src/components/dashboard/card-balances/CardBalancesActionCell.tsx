import { memberFullLabel } from '@ploutizo/utils';
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
import type { CardBalanceRowViewModel } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { SettlePayTowardMenuItem } from '@/components/dashboard/card-balances/SettlePayTowardMenuItem';

type CardBalancesActionCellProps = {
  row: CardBalanceRowViewModel;
  onSettleClick: CardBalancesSettleClickHandler;
};

const sortMembersForMenu = (row: CardBalanceRowViewModel) =>
  [...row.members].sort((a, b) =>
    memberFullLabel(a.member).localeCompare(
      memberFullLabel(b.member),
      undefined,
      {
        sensitivity: 'base',
      }
    )
  );

export const CardBalancesActionCell = ({
  row,
  onSettleClick,
}: CardBalancesActionCellProps) => {
  const menuMembers = sortMembersForMenu(row);

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
              aria-label={`Settle ${row.account.name}`}
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
            {menuMembers.map((memberRow) => (
              <SettlePayTowardMenuItem
                key={memberRow.member.id}
                label={memberFullLabel(memberRow.member)}
                balanceCents={memberRow.personalBalanceCents}
                onSelect={() => onSettleClick(row, memberRow.member.id)}
              />
            ))}
            <SettlePayTowardMenuItem
              label="Shared"
              balanceCents={row.sharedBalanceCents}
              onSelect={() => onSettleClick(row, 'shared')}
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
