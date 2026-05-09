import { Button } from '@ploutizo/ui/components/button';
import { Progress } from '@ploutizo/ui/components/progress';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import type { MemberColorSlot } from '@/lib/memberColors';
import { formatCurrency } from '@/lib/formatCurrency';
import { UserAvatar } from '@/components/members/UserAvatar';

type CardBalancesMemberBreakdownRowProps = {
  account: SettlementAccountRow;
  memberRow: SettlementMemberRow;
  /** Sum of |balanceCents| across members; used for Progress share. */
  absTotalCents: number;
  memberColorSlot: MemberColorSlot;
  onSettleClick: CardBalancesSettleClickHandler;
};

export const CardBalancesMemberBreakdownRow = ({
  account,
  memberRow,
  absTotalCents,
  memberColorSlot,
  onSettleClick,
}: CardBalancesMemberBreakdownRowProps) => {
  const isCredit = memberRow.balanceCents < 0;
  const pct = Math.round(
    (Math.abs(memberRow.balanceCents) / Math.max(1, absTotalCents)) * 100
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar
        name={memberRow.member.name}
        imageUrl={memberRow.member.avatarUrl}
        size="sm"
      />
      <Progress
        value={pct}
        className="h-2 min-w-0 flex-1"
        aria-label={`${memberRow.member.name} portion`}
      />
      <Text
        as="span"
        variant="body-sm"
        className={cn(
          'shrink-0 font-medium whitespace-nowrap tabular-nums',
          isCredit ? 'text-success' : 'text-foreground'
        )}
      >
        {formatCurrency(Math.abs(memberRow.balanceCents))}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Settle for ${memberRow.member.name} on ${account.account.name}`}
        // opacity-0 (NOT display:none) preserves tab order — RESEARCH Pitfall 1,
        // UI-SPEC Accessibility Contract.
        className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 focus:opacity-100"
        onClick={() => onSettleClick(account, memberRow)}
        // data-color-slot references the slot for future per-member progress fill (Phase 7.3).
        data-color-slot={memberColorSlot.bg}
      >
        Settle
      </Button>
    </div>
  );
};
