import { useMemo } from 'react';
import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import { CardBalancesMemberBreakdownRow } from '@/components/dashboard/card-balances/CardBalancesMemberBreakdownRow';
import { MEMBER_COLORS, buildMemberColorSlotMap } from '@/lib/memberColors';

type CardBalancesBreakdownCellProps = {
  account: SettlementAccountRow;
  onSettleClick: (
    account: SettlementAccountRow,
    member: SettlementMemberRow
  ) => void;
};

export const CardBalancesBreakdownCell = ({
  account,
  onSettleClick,
}: CardBalancesBreakdownCellProps) => {
  const absTotalCents = account.members.reduce(
    (sum, m) => sum + Math.abs(m.balanceCents),
    0
  );

  const memberColorSlotMap = useMemo(
    () =>
      buildMemberColorSlotMap(
        account.members.map((m) => ({ id: m.member.id }))
      ),
    [account.members]
  );

  return (
    <div className="space-y-1">
      {account.members.map((m) => (
        <CardBalancesMemberBreakdownRow
          key={m.member.id}
          account={account}
          memberRow={m}
          absTotalCents={absTotalCents}
          memberColorSlot={
            memberColorSlotMap.get(m.member.id) ?? MEMBER_COLORS[0]
          }
          onSettleClick={onSettleClick}
        />
      ))}
    </div>
  );
};
