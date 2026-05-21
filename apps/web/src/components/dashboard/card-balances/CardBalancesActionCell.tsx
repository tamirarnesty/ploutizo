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
import type { SettlementAccountRow } from '@ploutizo/types';
import type {
  CardBalancesSettleClickHandler,
  PayTowardTarget,
} from '@/components/dashboard/card-balances/types';
import { formatSignedBalanceCents } from '@/lib/formatCurrency';

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

  const handleSelect = (target: PayTowardTarget) => {
    onSettleClick(account, target);
  };

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
            {menuMembers.map((m) => {
              const display = formatSignedBalanceCents(m.personalBalanceCents);
              return (
                <DropdownMenuItem
                  key={m.member.id}
                  className="flex w-full min-w-0 cursor-pointer items-center gap-3"
                  onClick={() =>
                    handleSelect({ kind: 'member', memberId: m.member.id })
                  }
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
                    className={cn(
                      'shrink-0 whitespace-nowrap tabular-nums',
                      display.tone === 'credit' && 'text-success',
                      display.tone === 'zero' && 'text-muted-foreground',
                      display.tone === 'owed' && 'text-foreground'
                    )}
                  >
                    {display.text}
                  </Text>
                </DropdownMenuItem>
              );
            })}
            {(() => {
              const display = formatSignedBalanceCents(
                account.sharedBalanceCents
              );
              return (
                <DropdownMenuItem
                  className="flex w-full min-w-0 cursor-pointer items-center gap-3"
                  onClick={() => handleSelect({ kind: 'shared' })}
                >
                  <Text
                    variant="body-sm"
                    className="min-w-0 flex-1 truncate leading-tight font-medium"
                  >
                    Shared
                  </Text>
                  <Text
                    as="span"
                    variant="body-sm"
                    className={cn(
                      'shrink-0 whitespace-nowrap tabular-nums',
                      display.tone === 'credit' && 'text-success',
                      display.tone === 'zero' && 'text-muted-foreground',
                      display.tone === 'owed' && 'text-foreground'
                    )}
                  >
                    {display.text}
                  </Text>
                </DropdownMenuItem>
              );
            })()}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
