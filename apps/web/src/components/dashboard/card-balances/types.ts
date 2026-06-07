import type { SettlementAccountRow } from '@ploutizo/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export type CardBalancesSettleClickHandler = (
  account: SettlementAccountRow,
  payToward: PayToward
) => void;

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  isLoading: boolean;
  onSettleClick: CardBalancesSettleClickHandler;
}
