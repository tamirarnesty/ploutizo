import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export type CardBalancesSettleClickHandler = (
  account: SettlementAccountRow,
  payToward: PayToward
) => void;

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  household: readonly OrgMember[];
  isLoading: boolean;
  onSettleClick: CardBalancesSettleClickHandler;
}
