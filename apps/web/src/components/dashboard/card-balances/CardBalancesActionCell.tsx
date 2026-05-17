import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { WalletCards } from 'lucide-react';
import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { formatCurrency } from '@/lib/formatCurrency';

type CardBalancesActionCellProps = {
  account: SettlementAccountRow;
  onSettleClick: CardBalancesSettleClickHandler;
};

const sortMembersForMenu = (
  members: SettlementMemberRow[]
): SettlementMemberRow[] =>
  [...members].sort((a, b) => {
    const byBal =
      Math.abs(b.balanceCents) - Math.abs(a.balanceCents) ||
      b.balanceCents - a.balanceCents;
    if (byBal !== 0) return byBal;
    return a.member.id.localeCompare(b.member.id);
  });

export const CardBalancesActionCell = ({
  account,
  onSettleClick,
}: CardBalancesActionCellProps) => {
  const menuMembers = sortMembersForMenu(account.members).filter(
    (m) => m.balanceCents !== 0
  );
  const rows =
    menuMembers.length > 0 ? menuMembers : sortMembersForMenu(account.members);

  return (
    <div
      className={cn(
        'flex justify-end',
        'opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
        // Always show when motion is reduced — hover behaviour can be distracting to replace with “hidden”.
        'motion-reduce:opacity-100',
        'group-focus-within/row:opacity-100 group-hover/row:opacity-100',
        '[&:has([data-slot="dropdown-menu-trigger"][data-popup-open])]:opacity-100',
        '[&:has(button[aria-expanded="true"])]:opacity-100'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            // Sketch 006: solid contrasting trigger (readable icon + label).
            <Button
              size="sm"
              aria-label={`Open settle actions for ${account.account.name}`}
              aria-haspopup="menu"
            >
              <WalletCards className="size-4 shrink-0" aria-hidden />
              Settle
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[0.625rem] font-bold tracking-wider text-muted-foreground uppercase">
              Settle member
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {rows.map((m) => (
              <DropdownMenuItem
                key={m.member.id}
                className="flex w-full min-w-0 cursor-pointer items-center gap-3"
                onClick={() => onSettleClick(account, m)}
              >
                <Text
                  variant="body-sm"
                  className="min-w-0 flex-1 truncate leading-tight font-medium"
                >
                  {m.member.name}
                </Text>
                <Text
                  as="span"
                  variant="body-sm"
                  className={`shrink-0 font-medium whitespace-nowrap tabular-nums ${
                    m.balanceCents < 0 ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(Math.abs(m.balanceCents))}
                </Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
